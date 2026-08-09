import { db } from './firebase-config.js';
import { 
  collection, query, where, getDocs, getDoc, doc 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

export async function getAllStudentsOfTeacher(teacherId) {
  const q = query(collection(db, 'users'), where('teacherId', '==', teacherId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function isTeacher(uid) {
  const userDoc = await getDoc(doc(db, 'users', uid));
  return userDoc.exists() && userDoc.data().role === 'teacher';
}