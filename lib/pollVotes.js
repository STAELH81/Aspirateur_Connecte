const path = require("path");
const { createStore } = require("./jsonStore");

const store = createStore(path.join(__dirname, "..", "data", "poll-votes.json"), {
  defaultData: {},
});

function getVotes(messageId) {
  const all = store.load();
  return all[messageId] || {};
}

function vote(messageId, userId, optionIndex) {
  const all = store.load();
  if (!all[messageId]) all[messageId] = {};
  all[messageId][userId] = optionIndex;
  store.save(all);
  return all[messageId];
}

function countVotes(messageId, optionCount) {
  const votes = getVotes(messageId);
  const counts = Array(optionCount).fill(0);
  for (const idx of Object.values(votes)) {
    if (idx >= 0 && idx < optionCount) counts[idx]++;
  }
  return counts;
}

module.exports = { vote, countVotes, getVotes };
