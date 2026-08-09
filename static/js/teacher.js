// Этот файл в основном дублирует функции из db.js, но добавлены дополнительные методы,
// которые могут понадобиться только педагогу.
import { db } from './firebase-config.js';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

// Получить всех учеников для педагога (по всем классам) – необязательно
export async function getAllStudentsOfTeacher(teacherId) {
  const q = query(collection(db, 'users'), where('teacherId', '==', teacherId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Проверить, является ли пользователь педагогом
export async function isTeacher(uid) {
  const userDoc = await getDoc(doc(db, 'users', uid));
  return userDoc.exists() && userDoc.data().role === 'teacher';
}