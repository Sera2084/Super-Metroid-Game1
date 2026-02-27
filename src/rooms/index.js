import { room01 } from './room_01';
import { room02 } from './room_02';
import { room03 } from './room_03';
import { room04 } from './room_04';
import { room05 } from './room_05';
import { room06 } from './room_06';

/**
 * Das System ist bewusst auf 50+ Räume ausgelegt.
 * Weitere Räume werden einfach als `room_07.js` ... `room_50.js` ergänzt
 * und hier im Registry-Array eingetragen.
 */
export const MAX_SUPPORTED_ROOMS = 50;

const ROOM_LIST = [room01, room02, room03, room04, room05, room06];

export const ROOM_REGISTRY = Object.fromEntries(ROOM_LIST.map((room) => [room.id, room]));

export function getRoomById(roomId) {
  return ROOM_REGISTRY[roomId] ?? null;
}

export function getRegisteredRoomCount() {
  return ROOM_LIST.length;
}
