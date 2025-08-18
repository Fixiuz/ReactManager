// src/firebase/config.j
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Pega aquí el objeto firebaseConfig que copiaste de la consola de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDv2hX7aeBWQIE2lFvLK1Rf9B_HE5-51ss",
  authDomain: "reactmanager-43c09.firebaseapp.com",
  projectId: "reactmanager-43c09",
  storageBucket: "reactmanager-43c09.firebasestorage.app",
  messagingSenderId: "983583382428",
  appId: "1:983583382428:web:23d6d7813bf9c33930c659"
};

// Inicializa la app de Firebase
const app = initializeApp(firebaseConfig);

// Exporta los servicios que vamos a usar
export const db = getFirestore(app);
export const auth = getAuth(app);