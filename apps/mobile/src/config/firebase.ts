import { initializeApp, getApps, getApp } from "firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FirebaseAuth from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { appEnv } from "./env";

const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(appEnv.firebase);

const getAuth = FirebaseAuth.getAuth;
const initializeAuth = FirebaseAuth.initializeAuth;
const getReactNativePersistence =
	(FirebaseAuth as unknown as { getReactNativePersistence?: (storage: unknown) => unknown })
		.getReactNativePersistence;

const auth = (() => {
	try {
		if (getReactNativePersistence) {
			const persistence = getReactNativePersistence(AsyncStorage) as FirebaseAuth.Persistence;
			return initializeAuth(firebaseApp, {
				persistence,
			});
		}

		return getAuth(firebaseApp);
	} catch {
		return getAuth(firebaseApp);
	}
})();

export { auth };
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
