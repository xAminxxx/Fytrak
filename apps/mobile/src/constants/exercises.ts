import { WorkoutSetType } from "../services/workoutService";
import i18n from "../i18n";

/**
 * Localized name map — supports en, fr, ar.
 * When a coach selects an exercise, the trainee sees it in their own language.
 */
export type LocalizedString = {
    en: string;
    fr: string;
    ar: string;
};

export type ExerciseLibraryItem = {
    id: string;
    name: LocalizedString;
    muscleGroup: "Chest" | "Back" | "Legs" | "Shoulders" | "Arms" | "Core" | "Cardio" | "Full Body";
    equipment: "Barbell" | "Dumbbell" | "Machine" | "Cable" | "Bodyweight" | "Kettlebell" | "None";
    defaultType: WorkoutSetType;
    mechanicsType?: "Compound" | "Isolation";
    videoUrl?: string;
    thumbnailUrl?: string;
    instructions?: LocalizedString[];
};

/**
 * Resolves a LocalizedString to the user's current language.
 * Falls back to English if translation is missing.
 */
export function t(localized: LocalizedString | string): string {
    if (typeof localized === "string") return localized;
    const lang = (i18n.language || "en") as keyof LocalizedString;
    return localized[lang] || localized.en;
}

export const EXERCISE_LIBRARY: ExerciseLibraryItem[] = [
    // ─── CHEST ───
    {
        id: "e1",
        name: { en: "Barbell Bench Press", fr: "Développé couché barre", ar: "بنش بريس بالبار" },
        muscleGroup: "Chest", equipment: "Barbell", defaultType: "WEIGHT_REPS", mechanicsType: "Compound",
        instructions: [
            { en: "Lie flat on the bench with your eyes under the bar.", fr: "Allongez-vous sur le banc, les yeux sous la barre.", ar: "استلقِ على المقعد بحيث تكون عيناك تحت البار." },
            { en: "Grip the bar slightly wider than shoulder-width.", fr: "Saisissez la barre légèrement plus large que la largeur des épaules.", ar: "أمسك البار بعرض أوسع قليلاً من الكتفين." },
            { en: "Lower the bar to your mid-chest.", fr: "Descendez la barre vers le milieu de votre poitrine.", ar: "أنزل البار إلى منتصف صدرك." },
            { en: "Press the bar back up until your arms are straight.", fr: "Poussez la barre vers le haut jusqu'à ce que vos bras soient tendus.", ar: "ادفع البار للأعلى حتى تستقيم ذراعاك." }
        ]
    },
    {
        id: "e2",
        name: { en: "Incline Dumbbell Press", fr: "Développé incliné haltères", ar: "بريس مائل بالدمبل" },
        muscleGroup: "Chest", equipment: "Dumbbell", defaultType: "WEIGHT_REPS", mechanicsType: "Compound",
        instructions: [
            { en: "Set the bench to a 30-45 degree incline.", fr: "Réglez le banc à une inclinaison de 30-45 degrés.", ar: "اضبط المقعد بزاوية ميل 30-45 درجة." },
            { en: "Press the dumbbells straight up over your chest.", fr: "Poussez les haltères droit au-dessus de votre poitrine.", ar: "ادفع الدمبلز للأعلى فوق صدرك." },
            { en: "Lower them slowly until you feel a stretch in your chest.", fr: "Descendez-les lentement jusqu'à sentir un étirement.", ar: "أنزلهما ببطء حتى تشعر بتمدد في صدرك." }
        ]
    },
    {
        id: "e3",
        name: { en: "Push-ups", fr: "Pompes", ar: "تمارين الضغط" },
        muscleGroup: "Chest", equipment: "Bodyweight", defaultType: "BODYWEIGHT", mechanicsType: "Compound",
        instructions: [
            { en: "Start in a high plank position with your hands shoulder-width apart.", fr: "Commencez en position de planche haute, mains écartées à la largeur des épaules.", ar: "ابدأ في وضع البلانك العالي ويداك بعرض الكتفين." },
            { en: "Lower your body until your chest nearly touches the floor.", fr: "Descendez votre corps jusqu'à ce que votre poitrine touche presque le sol.", ar: "أنزل جسمك حتى يقترب صدرك من الأرض." },
            { en: "Keep your core tight and back flat.", fr: "Gardez le ventre serré et le dos plat.", ar: "حافظ على شد عضلات البطن واستقامة الظهر." },
            { en: "Push back up to the starting position.", fr: "Repoussez vers le haut jusqu'à la position de départ.", ar: "ادفع للأعلى إلى وضع البداية." }
        ]
    },
    {
        id: "e4",
        name: { en: "Cable Crossovers", fr: "Croisé aux câbles", ar: "تقاطع الكابلات" },
        muscleGroup: "Chest", equipment: "Cable", defaultType: "WEIGHT_REPS", mechanicsType: "Isolation"
    },

    // ─── BACK ───
    {
        id: "e5",
        name: { en: "Pull-ups", fr: "Tractions", ar: "تمرين العقلة" },
        muscleGroup: "Back", equipment: "Bodyweight", defaultType: "BODYWEIGHT", mechanicsType: "Compound",
        instructions: [
            { en: "Grab the bar with an overhand grip, slightly wider than shoulder-width.", fr: "Saisissez la barre en pronation, légèrement plus large que les épaules.", ar: "أمسك البار بقبضة علوية أوسع قليلاً من الكتفين." },
            { en: "Pull yourself up until your chin clears the bar.", fr: "Tirez-vous vers le haut jusqu'à ce que votre menton dépasse la barre.", ar: "اسحب نفسك للأعلى حتى يتجاوز ذقنك البار." },
            { en: "Lower yourself back down with control.", fr: "Redescendez de manière contrôlée.", ar: "أنزل نفسك ببطء وتحكم." }
        ]
    },
    {
        id: "e6",
        name: { en: "Lat Pulldown", fr: "Tirage vertical", ar: "سحب علوي" },
        muscleGroup: "Back", equipment: "Machine", defaultType: "WEIGHT_REPS", mechanicsType: "Compound"
    },
    {
        id: "e7",
        name: { en: "Barbell Row", fr: "Rowing barre", ar: "تجديف بالبار" },
        muscleGroup: "Back", equipment: "Barbell", defaultType: "WEIGHT_REPS", mechanicsType: "Compound"
    },
    {
        id: "e8",
        name: { en: "Seated Cable Row", fr: "Tirage horizontal assis", ar: "تجديف بالكابل جالساً" },
        muscleGroup: "Back", equipment: "Cable", defaultType: "WEIGHT_REPS", mechanicsType: "Compound"
    },

    // ─── LEGS ───
    {
        id: "e9",
        name: { en: "Barbell Squat", fr: "Squat barre", ar: "سكوات بالبار" },
        muscleGroup: "Legs", equipment: "Barbell", defaultType: "WEIGHT_REPS", mechanicsType: "Compound"
    },
    {
        id: "e10",
        name: { en: "Romanian Deadlift", fr: "Soulevé de terre roumain", ar: "رفعة ميتة رومانية" },
        muscleGroup: "Legs", equipment: "Barbell", defaultType: "WEIGHT_REPS", mechanicsType: "Compound"
    },
    {
        id: "e11",
        name: { en: "Leg Press", fr: "Presse à cuisses", ar: "ضغط الأرجل" },
        muscleGroup: "Legs", equipment: "Machine", defaultType: "WEIGHT_REPS", mechanicsType: "Compound"
    },
    {
        id: "e12",
        name: { en: "Walking Lunges", fr: "Fentes marchées", ar: "فتحات المشي" },
        muscleGroup: "Legs", equipment: "Dumbbell", defaultType: "WEIGHT_REPS", mechanicsType: "Compound"
    },
    {
        id: "e13",
        name: { en: "Calf Raises", fr: "Mollets debout", ar: "رفع السمانة" },
        muscleGroup: "Legs", equipment: "Machine", defaultType: "WEIGHT_REPS", mechanicsType: "Isolation"
    },

    // ─── SHOULDERS ───
    {
        id: "e14",
        name: { en: "Overhead Press", fr: "Développé militaire", ar: "ضغط علوي" },
        muscleGroup: "Shoulders", equipment: "Barbell", defaultType: "WEIGHT_REPS", mechanicsType: "Compound"
    },
    {
        id: "e15",
        name: { en: "Lateral Raises", fr: "Élévations latérales", ar: "رفع جانبي" },
        muscleGroup: "Shoulders", equipment: "Dumbbell", defaultType: "WEIGHT_REPS", mechanicsType: "Isolation"
    },
    {
        id: "e16",
        name: { en: "Face Pulls", fr: "Tirage visage", ar: "سحب للوجه" },
        muscleGroup: "Shoulders", equipment: "Cable", defaultType: "WEIGHT_REPS", mechanicsType: "Isolation"
    },

    // ─── ARMS ───
    {
        id: "e17",
        name: { en: "Barbell Curl", fr: "Curl barre", ar: "كيرل بالبار" },
        muscleGroup: "Arms", equipment: "Barbell", defaultType: "WEIGHT_REPS", mechanicsType: "Isolation"
    },
    {
        id: "e18",
        name: { en: "Tricep Pushdown", fr: "Extension triceps câble", ar: "ضغط التراي بالكابل" },
        muscleGroup: "Arms", equipment: "Cable", defaultType: "WEIGHT_REPS", mechanicsType: "Isolation"
    },
    {
        id: "e19",
        name: { en: "Dumbbell Hammer Curl", fr: "Curl marteau haltères", ar: "كيرل مطرقة بالدمبل" },
        muscleGroup: "Arms", equipment: "Dumbbell", defaultType: "WEIGHT_REPS", mechanicsType: "Isolation"
    },
    {
        id: "e20",
        name: { en: "Overhead Tricep Extension", fr: "Extension triceps au-dessus de la tête", ar: "تمديد التراي فوق الرأس" },
        muscleGroup: "Arms", equipment: "Dumbbell", defaultType: "WEIGHT_REPS", mechanicsType: "Isolation"
    },

    // ─── CORE ───
    {
        id: "e21",
        name: { en: "Plank", fr: "Gainage", ar: "البلانك" },
        muscleGroup: "Core", equipment: "Bodyweight", defaultType: "TIME", mechanicsType: "Isolation",
        instructions: [
            { en: "Rest your forearms on the floor, elbows directly under your shoulders.", fr: "Posez vos avant-bras au sol, coudes directement sous les épaules.", ar: "ضع ساعديك على الأرض مع وضع المرفقين مباشرة تحت الكتفين." },
            { en: "Extend your legs out straight behind you.", fr: "Étendez vos jambes derrière vous.", ar: "مدّ ساقيك بشكل مستقيم خلفك." },
            { en: "Hold this position, keeping your core engaged.", fr: "Maintenez cette position, ventre serré.", ar: "حافظ على هذا الوضع مع شد عضلات البطن." }
        ]
    },
    {
        id: "e22",
        name: { en: "Crunch", fr: "Crunch", ar: "كرنش" },
        muscleGroup: "Core", equipment: "Bodyweight", defaultType: "BODYWEIGHT", mechanicsType: "Isolation"
    },
    {
        id: "e23",
        name: { en: "Hanging Leg Raise", fr: "Relevé de jambes suspendu", ar: "رفع الأرجل معلقاً" },
        muscleGroup: "Core", equipment: "Bodyweight", defaultType: "BODYWEIGHT", mechanicsType: "Isolation"
    },
    {
        id: "e24",
        name: { en: "Russian Twists", fr: "Rotations russes", ar: "لفات روسية" },
        muscleGroup: "Core", equipment: "Bodyweight", defaultType: "BODYWEIGHT", mechanicsType: "Isolation"
    },

    // ─── CARDIO / FULL BODY ───
    {
        id: "e25",
        name: { en: "Treadmill Run", fr: "Course sur tapis", ar: "جري على السير" },
        muscleGroup: "Cardio", equipment: "Machine", defaultType: "TIME"
    },
    {
        id: "e26",
        name: { en: "Jump Rope", fr: "Corde à sauter", ar: "نط الحبل" },
        muscleGroup: "Cardio", equipment: "None", defaultType: "TIME"
    },
    {
        id: "e27",
        name: { en: "Burpees", fr: "Burpees", ar: "بيربي" },
        muscleGroup: "Full Body", equipment: "Bodyweight", defaultType: "BODYWEIGHT", mechanicsType: "Compound"
    },
    {
        id: "e28",
        name: { en: "Rowing Machine", fr: "Rameur", ar: "آلة التجديف" },
        muscleGroup: "Cardio", equipment: "Machine", defaultType: "TIME"
    },
    // ─── FROM WORKOUT-COOL ───
    {
        id: "wc157",
        name: { en: "Barbell Alternating Reverse Lunges", fr: "Fentes arrières à la barre", ar: "" },
        muscleGroup: "Legs", equipment: "Barbell", defaultType: "WEIGHT_REPS", mechanicsType: "Compound",
        videoUrl: "https://www.youtube.com/embed/NmfQzqGktgs?autoplay=1",
        instructions: [
            { en: "Stand upright holding a barbell placed across the back of your shoulders.", fr: "Tenez-vous droit en tenant une barre placée sur l'arrière de vos épaules.", ar: "" },
            { en: "Step back 2-3 feet with one foot and lower your body to the ground.", fr: "Faites un pas en arrière de 2 à 3 pieds avec un pied et abaissez votre corps au sol.", ar: "" },
            { en: "Your back knee should almost touch the ground and your front knee should be at a 90-degree angle.", fr: "Votre genou arrière doit presque toucher le sol et votre genou avant doit être à un angle de 90 degrés.", ar: "" },
            { en: "Push up to return to the starting position.", fr: "Poussez vers le haut et revenez à la position de départ.", ar: "" },
            { en: "Repeat with the other leg.", fr: "Répétez avec l'autre jambe.", ar: "" },
            { en: "Repeat the movement for the recommended number of repetitions, then switch to the other leg.", fr: "Répétez le mouvement pour le nombre recommandé de répétitions, puis effectuez avec l'autre jambe.", ar: "" }
        ]
    },
    {
        id: "wc163",
        name: { en: "Facepulls", fr: "Tirage horizontal (front) corde à la poulie haute", ar: "" },
        muscleGroup: "Shoulders", equipment: "Cable", defaultType: "WEIGHT_REPS", mechanicsType: "Isolation",
        videoUrl: "https://www.youtube.com/embed/3ZViIERC1QQ?autoplay=1",
        instructions: [
            { en: "Attach a rope to a low pulley cable machine.", fr: "Fixez une corde à la machine à câble à un réglage bas.", ar: "" },
            { en: "Stand facing the machine and hold the rope with an overhand grip.", fr: "Tenez-vous face à la machine et tenez la corde avec une prise en pronation.", ar: "" },
            { en: "Step back to create tension in the cable, with feet shoulder-width apart.", fr: "Reculez pour créer une tension dans le câble, les pieds écartés à la largeur des épaules.", ar: "" },
            { en: "Keep your back straight and lean slightly forward, bending your knees slightly.", fr: "Gardez le dos droit et penchez-vous légèrement en avant, en fléchissant légèrement les genoux.", ar: "" },
            { en: "Pull the rope towards your chest, squeezing your shoulder blades together.", fr: "Tirez la corde vers votre poitrine, en contractant vos omoplates ensemble.", ar: "" },
            { en: "Pause at the end of the movement, then slowly release and extend your arms back to the starting position.", fr: "Faites une pause à la fin du mouvement, puis relâchez lentement et étendez vos bras jusqu'à la position de départ.", ar: "" },
            { en: "Repeat for the desired number of repetitions.", fr: "Répétez le nombre souhaité de répétitions.", ar: "" }
        ]
    },
    {
        id: "wc164",
        name: { en: "Bench Hops", fr: "Sauts altérnés aux côtés du banc", ar: "" },
        muscleGroup: "Full Body", equipment: "None", defaultType: "TIME", mechanicsType: "Compound",
        videoUrl: "https://www.youtube.com/embed/R3TCOHRwCl8?autoplay=1",
        instructions: [
            { en: "Start with a box or bench in front of you. Stand with feet shoulder-width apart. This will be your starting position.", fr: "Commencez avec une box ou un banc devant vous. Tenez-vous debout, les pieds écartés de la largeur des épaules. ce sera votre position de départ.", ar: "" },
            { en: "Perform a short squat in preparation for the jump.", fr: "Effectuez un court squat en préparation du saut", ar: "" },
            { en: "Jump over the bench, landing with your knees bent, absorbing the impact through your legs.", fr: "Sautez par-dessus le banc, atterrissez avec les genoux pliés, en absorbant l'impact à travers les jambes.", ar: "" }
        ]
    }
];
