// Chat and reactions. The server relays to others only, so our own are rendered locally.
import { $ } from './ui.js';
import { S, send } from './state.js';
import { REACTIONS } from './protocol.js';
import { isStageFullscreen, toast } from './stage.js';

export function addMessage(name, text, mine) {
  const log = $('log');
  const msg = document.createElement('div');
  msg.className = mine ? 'msg me' : 'msg';
  if (!mine) {
    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = name;
    msg.append(who);
  }
  msg.append(document.createTextNode(text));
  // Only follow new messages if already near the bottom.
  const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
  log.append(msg);
  if (atBottom || mine) log.scrollTop = log.scrollHeight;
  if (!mine && isStageFullscreen()) toast(name, text);
}

export function floatEmoji(emoji) {
  const f = document.createElement('span');
  f.className = 'floater';
  f.textContent = emoji;
  f.style.left = `${10 + Math.random() * 80}%`;
  f.addEventListener('animationend', () => f.remove());
  $('floaters').append(f);
}

function reactionButtons() {
  return REACTIONS.map((emoji) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = emoji;
    b.onclick = () => {
      send({ type: 'reaction', emoji });
      floatEmoji(emoji);
    };
    return b;
  });
}
$('fsReactions').append(...reactionButtons());
$('reactions').append(...reactionButtons());

function sendChatFrom(input) {
  const text = input.value.trim();
  if (!text) return;
  send({ type: 'chat', text });
  addMessage(S.myName, text, true);
  input.value = '';
}
$('chatForm').onsubmit = (e) => {
  e.preventDefault();
  sendChatFrom($('chatInput'));
};
$('fsChat').onsubmit = (e) => {
  e.preventDefault();
  sendChatFrom($('fsChatInput'));
};
