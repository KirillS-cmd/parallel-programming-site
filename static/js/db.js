import { db } from './firebase-config.js';
import { 
  collection, doc, setDoc, getDoc, getDocs, query, where, 
  updateDoc, deleteDoc, addDoc 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { generateLogin, generatePassword } from './utils.js';
import { auth } from './firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

export async function createClass(teacherId, className) {
  const ref = await addDoc(collection(db, 'classes'), { name: className, teacherId, createdAt: new Date().toISOString() });
  return ref.id;
}

export async function getClasses(teacherId) {
  const q = query(collection(db, 'classes'), where('teacherId', '==', teacherId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getClass(classId) {
  const docSnap = await getDoc(doc(db, 'classes', classId));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

export async function addStudent(teacherId, classId, fullName) {
  const q = query(collection(db, 'users'), where('teacherId', '==', teacherId), where('name', '==', fullName));
  const snap = await getDocs(q);
  let studentId, login, password;
  if (!snap.empty) {
    studentId = snap.docs[0].id;
    const check = query(collection(db, 'studentClasses'), where('studentId', '==', studentId), where('classId', '==', classId));
    if (!(await getDocs(check)).empty) return { success: false, error: 'Ученик уже в этом классе' };
    login = generateLogin(fullName);
    password = generatePassword(8);
  } else {
    login = generateLogin(fullName);
    password = generatePassword(8);
    const email = `${login}@temp.local`;
    try {
      const uc = await createUserWithEmailAndPassword(auth, email, password);
      studentId = uc.user.uid;
      await setDoc(doc(db, 'users', studentId), {
        email, role: 'student', name: fullName, teacherId, isConfirmed: true,
        city: '', school: '', phone: ''
      });
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  await addDoc(collection(db, 'studentClasses'), { studentId, classId, login, password, createdAt: new Date().toISOString() });
  return { success: true, login, password };
}

export async function getStudentsWithProgress(classId) {
  const q = query(collection(db, 'studentClasses'), where('classId', '==', classId));
  const snap = await getDocs(q);
  const students = [];
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const userDoc = await getDoc(doc(db, 'users', data.studentId));
    if (!userDoc.exists()) continue;
    const userData = userDoc.data();
    const progQ = query(collection(db, 'progress'), where('studentId', '==', data.studentId));
    const progSnap = await getDocs(progQ);
    const progMap = {};
    progSnap.docs.forEach(p => { const pd = p.data(); progMap[`${pd.section}_${pd.itemId}`] = pd; });
    let practiceDone = 0;
    for (let i = 1; i <= 5; i++) if (progMap[`practice_task${i}`]?.completed) practiceDone++;
    const practicePercent = Math.round((practiceDone / 5) * 100);
    const codeExists = progMap['practice_task5']?.answer ? true : false;
    students.push({
      id: data.studentId,
      name: userData.name,
      login: data.login,
      password: data.password,
      practicePercent,
      codeExists,
      studentClassId: docSnap.id,
      progress: progMap
    });
  }
  return students;
}

export async function removeStudentFromClass(studentClassId) {
  await deleteDoc(doc(db, 'studentClasses', studentClassId));
}

export async function markProgress(studentId, section, itemId, completed = true, extra = {}) {
  const q = query(collection(db, 'progress'), where('studentId', '==', studentId), where('section', '==', section), where('itemId', '==', itemId));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, 'progress'), { studentId, section, itemId, completed, ...extra, timestamp: new Date().toISOString() });
  } else {
    await updateDoc(snap.docs[0].ref, { completed, ...extra });
  }
}

export async function getProgress(studentId) {
  const q = query(collection(db, 'progress'), where('studentId', '==', studentId));
  const snap = await getDocs(q);
  const result = {};
  snap.docs.forEach(d => { const data = d.data(); result[`${data.section}_${data.itemId}`] = data; });
  return result;
}

export async function getStudentCode(studentId) {
  const q = query(collection(db, 'progress'), where('studentId', '==', studentId), where('section', '==', 'practice'), where('itemId', '==', 'task5'));
  const snap = await getDocs(q);
  return snap.empty ? null : snap.docs[0].data();
}

export async function markCodeChecked(studentId) {
  const q = query(collection(db, 'progress'), where('studentId', '==', studentId), where('section', '==', 'practice'), where('itemId', '==', 'task5'));
  const snap = await getDocs(q);
  if (!snap.empty) await updateDoc(snap.docs[0].ref, { completed: true, checkedByTeacher: true });
}

export async function getUser(userId) {
  const docSnap = await getDoc(doc(db, 'users', userId));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}