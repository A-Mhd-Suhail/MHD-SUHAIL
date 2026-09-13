import { onSnapshot, query, collection, where, type WhereFilterOp } from 'firebase/firestore';
import { db } from '../firebase';

/** Small live-binding helper used across tabs:
 * bind('medicines', [['patientId','==',uid]], setRows) returns unsubscribe. */
export function bind<T>(
  col: string,
  wheres: [string, WhereFilterOp, unknown][],
  cb: (rows: T[]) => void,
  err?: () => void,
): () => void {
  let q_ = query(collection(db, col));
  wheres.forEach(([f, op, v]) => { q_ = query(q_!, where(f, op, v)); });
  return onSnapshot(
    q_!,
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as T[]),
    () => err?.(),
  );
}
