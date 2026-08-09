import { db } from './firebase-config.js';
import { 
  collection, query, where, getDocs, getDoc, doc 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getClass } from './db.js';

export async function getStudentClasses(studentId) {
  const q = query(collection(db, 'studentClasses'), where('studentId', '==', studentId));
  const snap = await getDocs(q);
  const classes = [];
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const classData = await getClass(data.classId);
    classes.push({ ...data, class: classData });
  }
  return classes;
}

export async function isStudent(uid) {
  const userDoc = await getDoc(doc(db, 'users', uid));
  return userDoc.exists() && userDoc.data().role === 'student';
}