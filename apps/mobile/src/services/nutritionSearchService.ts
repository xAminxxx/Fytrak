/**
 * Nutrition Search Service
 * Integrates with Firestore Tunisian Food DB (INNTA) and Open Food Facts API
 */

import { db } from "../config/firebase";
import { collection, query, where, getDocs, limit, orderBy, startAt, endAt } from "firebase/firestore";

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingSize?: string;
  imageUrl?: string;
  isVerified?: boolean;
  source?: string;
}

const USER_AGENT = "FytrakMobile/1.0 (coding-assistant@fytrak.app)";
const OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";

export const searchFood = async (searchTerm: string): Promise<FoodItem[]> => {
  if (!searchTerm || searchTerm.trim().length < 2) return [];

  const normalizedQuery = searchTerm.toLowerCase().trim();

  // 1. Search Firestore 'foods' collection
  let firestoreResults: FoodItem[] = [];
  try {
    const foodsRef = collection(db, "foods");
    
    // We search by name prefix for better performance in Firestore
    const q = query(
      foodsRef, 
      orderBy("searchName"),
      startAt(normalizedQuery),
      endAt(normalizedQuery + "\uf8ff"),
      limit(10)
    );

    const snapshot = await getDocs(q);
    firestoreResults = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        brand: data.nameAr || "Tunisian Dish",
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fats: data.fats,
        servingSize: data.serving,
        isVerified: true,
        source: data.source
      };
    });
  } catch (err) {
    console.error("[NutritionSearch] Firestore query failed:", err);
  }

  // 2. Search Open Food Facts
  try {
    const url = `${OFF_SEARCH_URL}?search_terms=${encodeURIComponent(searchTerm)}&search_simple=1&action=process&json=1&page_size=20`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
      },
    });

    if (!response.ok) return firestoreResults;

    const data = await response.json();
    if (!data.products) return firestoreResults;

    const apiResults: FoodItem[] = data.products.map((p: any) => ({
      id: p.code,
      name: p.product_name || p.product_name_en || "Unknown Product",
      brand: p.brands,
      calories: Math.round(p.nutriments?.["energy-kcal_100g"] || 0),
      protein: p.nutriments?.protein_100g || 0,
      carbs: p.nutriments?.carbohydrates_100g || 0,
      fats: p.nutriments?.fat_100g || 0,
      servingSize: p.serving_size || "100g",
      imageUrl: p.image_front_small_url,
      isVerified: false,
      source: "Open Food Facts"
    }));

    // Merge results: Firestore (Tunisian) first, then API
    // Filter out duplicates if any (by name)
    const allResults = [...firestoreResults, ...apiResults];
    const uniqueResults = allResults.filter((v, i, a) => a.findIndex(t => (t.name === v.name)) === i);

    return uniqueResults;
  } catch (error) {
    console.error("[NutritionSearch] API fallback failed:", error);
    return firestoreResults;
  }
};
