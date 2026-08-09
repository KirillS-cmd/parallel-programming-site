import { db } from './firebase-config.js';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Получить классы ученика (по studentId)
export async function getStudentClasses(studentId) {
  const q = query(collection(db, 'studentClasses'), where('studentId', '==', studentId));
  const snap = await getDocs(q);
  const classes = [];
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const classData = await getClass(data.classId); // импортируем из db.js
    classes.push({ ...data, class: classData });
  }
  return classes;
}

// Проверить, является ли пользователь учеником
export async function isStudent(uid) {
  const userDoc = await getDoc(doc(db, 'users', uid));
  return userDoc.exists() && userDoc.data().role === 'student';
}