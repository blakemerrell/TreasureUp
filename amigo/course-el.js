// Wika: Greek, the weeks' treasure words (1 week, 4 words).
// Made by tools/wika-words.mjs from content/; don't edit it by hand: change the
// week's treasure words and run it again (both deploys run it). A word shows on
// the live app only once approved (approved: true here, its fingerprint matching).
(function (root) {
  'use strict';
  const COURSE = {
    "id": "el",
    "lang": "el",
    "kind": "words",
    "dir": "ltr",
    "name": "Greek",
    "native": "Ἑλληνικά",
    "who": "Treasure words · the New Testament’s own",
    "voices": [
      "el-GR",
      "el"
    ],
    "lessonNames": [
      "Hear",
      "See",
      "Pick"
    ],
    "praise": [
      "Bravo!",
      "Kalá! Good!",
      "Polý kalá! Very good!"
    ],
    "empty": "The Greek words come with next year’s New Testament. Learn the letters now, and you’ll be ready.",
    "units": [
      {
        "id": "w2026-12-21",
        "start": "2026-12-21",
        "title": "Christmas",
        "sub": "December 21–27",
        "dates": "December 21–27, 2026",
        "blurb": "We Have Waited for Him, and He Will Save Us",
        "done": "Bravo!",
        "doneNote": "“Bravo” is what Greeks say today too.",
        "approved": true,
        "words": [
          {
            "id": "luke2-phatne",
            "word": "φάτνη",
            "say": "FAT-nee",
            "gloss": "manger",
            "kjv": "manger",
            "means": "A manger: the box or trough that farm animals eat their food from.",
            "ref": "Luke 2:7",
            "strong": "G5336",
            "more": "The Son of God was laid where animals ate. The shepherds’ sign was finding a baby “lying in a manger” (Luke 2:12).",
            "approved": true
          },
          {
            "id": "luke2-euangelizomai",
            "word": "εὐαγγελίζομαι",
            "say": "ev-an-ge-LEE-zo-meh",
            "gloss": "bring good news",
            "kjv": "I bring you good tidings",
            "means": "To announce good news. In the New Testament it means sharing the good news of Jesus Christ and His salvation.",
            "ref": "Luke 2:10",
            "strong": "G2097",
            "more": "The angel was the first to announce the good news of Christ’s birth. Our English word “gospel” means the same thing: “good news.”",
            "approved": true
          },
          {
            "id": "luke2-soter",
            "word": "σωτήρ",
            "say": "so-TEER",
            "gloss": "Savior",
            "kjv": "Saviour",
            "means": "A savior: someone who rescues and delivers people from a danger they can’t escape on their own.",
            "ref": "Luke 2:11",
            "strong": "G4990",
            "more": "Kings in those days sometimes called themselves “savior.” But the angel announced the true Saviour: a baby in Bethlehem who saves us from sin and death.",
            "approved": true
          },
          {
            "id": "matt2-aster",
            "word": "ἀστήρ",
            "say": "as-TEER",
            "gloss": "star",
            "kjv": "star",
            "means": "A star: a light shining in the night sky. The wise men followed His star to find Jesus.",
            "ref": "Matthew 2:2",
            "strong": "G792",
            "more": "Balaam prophesied, “There shall come a Star out of Jacob” (Numbers 24:17). Jesus calls Himself “the bright and morning star” (Revelation 22:16).",
            "approved": true
          }
        ]
      }
    ]
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = COURSE;
  else (root.AMIGO_COURSES = root.AMIGO_COURSES || {}).el = COURSE;
})(this);
