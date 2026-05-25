/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const databaseId = firebaseConfig.firestoreDatabaseId || "ai-studio-244a6398-05b2-4037-852b-3044efa74e0f";
const db = getFirestore(app, databaseId);
const googleProvider = new GoogleAuthProvider();

// Setting flag to true to indicate the availability/intent of real Firebase mode
export const useRealFirebase = true;

// Connection test validation helper according to Integration Skill guidelines
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    // Attempt fetching a dummy path from Firestore server to verify connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection verified and active!");
    return true;
  } catch (error) {
    if (error instanceof Error) {
      console.warn("Firestore connectivity test message:", error.message);
      if (error.message.includes('the client is offline')) {
        console.error("The Firestore client is offline. Please check your network and Firebase configuration.");
      }
    }
    return false;
  }
}

// Optionally trigger the test on initialization
testFirestoreConnection();

export { app, auth, db, googleProvider };
