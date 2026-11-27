// Who's here (avatars with a green/amber dot), why the room is frozen, and the host lock button.
import { $, el, initial } from './ui.js';
import { S, send, locked } from './state.js';
import { setCallPartner } from './call.js';

export function renderPresence() {
  const people = S.control.people || [];
  $('people').replaceChildren(
    ...people.map((p) => {
      const a = el('div', `avatar${p.me ? ' me' : ''}${p.loading ? ' loading' : ''}`, initial(p.name));
      a.title = `${p.me ? 'You' : p.name}${p.host ? ' · has the remote' : ''}${p.loading ? ' · loading' : ' · ready'}`;
      a.append(el('span', 'dot'));
      return a;
    })
  );
  const others = people.filter((p) => !p.me);
  $('peopleText').textContent = others.length ? `You and ${others.map((p) => p.name).join(', ')}` : 'Waiting for your person…';
  const loading = others.filter((p) => p.loading).map((p) => p.name);
  const stalled = !!S.roomState?.stalled;
  $('stallChip').hidden = !stalled;
  if (stalled) $('stallChip').textContent = loading.length ? `Waiting for ${loading.join(' and ')} to load…` : 'Waiting for the video to load…';
  setCallPartner(others[0]?.name || null);
}

export function showControl() {
  const lockedRoom = S.control.mode === 'host';
  $('lockBtn').hidden = !S.control.isHost;
  $('lockBtn').querySelector('use').setAttribute('href', lockedRoom ? '#i-lock' : '#i-unlock');
  $('lockBtn').querySelector('.label').textContent = lockedRoom ? 'Locked' : 'Lock';
  $('lockBtn').classList.toggle('off', lockedRoom);
  $('hostNote').textContent = locked() ? `${S.control.hostName || 'The host'} has the remote` : '';
  renderPresence();
}
$('lockBtn').onclick = () => send({ type: 'control', mode: S.control.mode === 'host' ? 'everyone' : 'host' });
