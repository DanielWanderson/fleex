import * as firebase from "firebase/app";
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs, addDoc } from "firebase/firestore";
import { CONFIG } from "./config";

const app = firebase.initializeApp(CONFIG.firebase);
export const db = getFirestore(app);

// Helper for Firestore operations
export const fs = {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc
};

// Diagnostic function
export const testConnection = async () => {
    try {
        // Try to read a non-existent doc just to check connection/permissions
        const testRef = doc(db, "diagnostics", "ping");
        await getDoc(testRef);
        return { success: true, message: "Conectado ao Firebase" };
    } catch (e: any) {
        console.error("Firebase Connection Error:", e);
        let msg = e.message;
        if (e.code === 'permission-denied') msg = "Permissão Negada (Verifique as Regras do Firestore)";
        if (e.code === 'unavailable') msg = "Serviço Indisponível (Verifique sua internet)";
        return { success: false, message: msg };
    }
};