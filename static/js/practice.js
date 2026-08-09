import { markProgress, getProgress } from './db.js';

export async function checkQuestion(studentId, taskId, answer, correctAnswer) {
  const isCorrect = (answer === correctAnswer);
  await markProgress(studentId, 'practice', taskId, isCorrect, { score: isCorrect ? 1 : 0 });
  return isCorrect;
}

export async function checkDrag(studentId, taskId, userOrder, correctOrder) {
  const isCorrect = (userOrder.length === correctOrder.length && userOrder.every((val, idx) => val === correctOrder[idx]));
  await markProgress(studentId, 'practice', taskId, isCorrect, { score: isCorrect ? 1 : 0 });
  return isCorrect;
}

export async function submitCode(studentId, code) {
  await markProgress(studentId, 'practice', 'task5', false, { answer: code, checkedByTeacher: false });
  return true;
}

export async function getPracticeStatus(studentId) {
  const progress = await getProgress(studentId);
  const tasks = ['task1', 'task2', 'task3', 'task4', 'task5'];
  const completed = tasks.filter(t => progress[`practice_${t}`]?.completed);
  const current = tasks.find(t => !completed.includes(t));
  return { completed, current, allDone: completed.length === tasks.length };
}