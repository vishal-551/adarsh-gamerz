import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";


const firebaseConfig = {
  apiKey: "AIzaSyCj1OXVaF1FwkKnWcDVV3uL4nna_Zhzi28",
  authDomain: "adarsh-site-a1c65.firebaseapp.com",
  projectId: "adarsh-site-a1c65",
  storageBucket: "adarsh-site-a1c65.firebasestorage.app",
  messagingSenderId: "112905133843",
  appId: "1:112905133843:web:730c917631a492bed684e6",
  measurementId: "G-QTNPBFPXQM"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);