// Amigo · Kaibigan: Tagalog past the basics, for Blake (rusty mission Tagalog,
// the Philippines 2002–2004). He asked for everyday conversation, listening at
// native speed, and the grammar that's slipped. Each unit is a real
// conversation between two people, recorded in two Filipino voices at native
// speed, and the grammar it uses, in three lessons: Listen, Grammar, Say it.
// The rules are in amigo/README.md; tools/test-amigo.mjs checks every one.
(function (root) {
  'use strict';

  const COURSE = {
    id: 'tl2',
    lang: 'tl',
    kind: 'conversation',
    name: 'Tagalog',
    title: 'Past the basics',
    who: 'For Tatay · past the basics',
    voices: ['fil-PH', 'fil', 'tl-PH', 'tl'],
    // The recordings' voices (tools/amigo-voice.mjs): A is a man, B a woman,
    // at native speed (the first course's are slowed to 0.9).
    speakers: { A: 'fil-ph-Neural2-D', B: 'fil-ph-Neural2-A' },
    rate: 1,
    lessonNames: ['Listen', 'Grammar', 'Say it'],
    praise: ['Tama!', 'Magaling!', 'Ang galing!'],
    units: [
      {
        id: 'kumustahan-ulit', title: 'Kumustahan ulit', sub: 'Catching up',
        blurb: 'Running into an old friend, and what you’ve both done since: finished actions.',
        done: 'Ang galing mo!', doneNote: '“Ang galing mo!” means “You’re great at this!”',
        dialog: {
          setting: 'Ramon runs into Liza, an old friend, at the mall.',
          people: { A: 'Ramon', B: 'Liza' },
          lines: [
            { who: 'A', t: 'Uy, Liza! Ikaw ba ’yan? Ang tagal nating hindi nagkita!', en: 'Hey, Liza! Is that you? We haven’t seen each other in so long!' },
            { who: 'B', t: 'Ramon! Oo nga, mga limang taon na siguro. Kumusta ka na?', en: 'Ramon! That’s right, maybe five years now. How have you been?' },
            { who: 'A', t: 'Mabuti naman. Lumipat kami sa Laguna noong isang taon. Ikaw, saan ka na nakatira ngayon?', en: 'Good. We moved to Laguna last year. And you, where do you live now?' },
            { who: 'B', t: 'Nandito pa rin ako sa Quezon City, pero nagtrabaho ako sa Dubai nang tatlong taon.', en: 'I’m still here in Quezon City, but I worked in Dubai for three years.' },
            { who: 'A', t: 'Talaga? Kailan ka umuwi?', en: 'Really? When did you come home?' },
            { who: 'B', t: 'Umuwi ako noong Disyembre. Na-miss ko kasi ang pamilya ko.', en: 'I came home in December. I missed my family, you see.',
              note: '“Na-miss” is Taglish: the English “miss” with na-, the finished form.' },
            { who: 'A', t: 'Naiintindihan ko. Nag-asawa ka na ba?', en: 'I understand. Have you gotten married?' },
            { who: 'B', t: 'Oo! Ikinasal kami noong Pebrero. Ikaw, may mga anak ka na?', en: 'Yes! We got married in February. And you, do you have kids now?' },
            { who: 'A', t: 'Dalawa na. Ipinanganak ang bunso namin noong Agosto.', en: 'Two now. Our youngest was born in August.' },
            { who: 'B', t: 'Wow, congrats! Ano ang pangalan niya?', en: 'Wow, congrats! What’s the baby’s name?' },
            { who: 'A', t: 'Miguel. Uy, kumain ka na ba? Tara, kain tayo!', en: 'Miguel. Hey, have you eaten? Come on, let’s eat!' },
            { who: 'B', t: 'Sige, pero libre ko ngayon!', en: 'Sure, but it’s on me this time!',
              note: '“Libre ko” is “my treat”: libre is free, so “it’s free, on me.”' },
          ],
        },
        questions: [
          { q: 'How long since they last saw each other?', right: 'About five years', wrong: ['About a year', 'About ten years'], line: 2 },
          { q: 'Where did Ramon’s family move?', right: 'To Laguna', wrong: ['To Quezon City', 'To Dubai'], line: 3 },
          { q: 'What did Liza do in Dubai?', right: 'She worked there for three years', wrong: ['She studied there for three years', 'She got married there'], line: 4 },
          { q: 'Why did Liza come home?', right: 'She missed her family', wrong: ['She lost her job', 'Her contract ended'], line: 6 },
          { q: 'When was Ramon’s youngest born?', right: 'In August', wrong: ['In December', 'In February'], line: 9 },
          { q: 'Who pays for the meal?', right: 'Liza', wrong: ['Ramon', 'They split it'], line: 12 },
        ],
        gaps: [
          { line: 3, word: 'Lumipat', wrong: ['Lumilipat', 'Lilipat'] },
          { line: 4, word: 'nagtrabaho', wrong: ['nagtatrabaho', 'magtatrabaho'] },
          { line: 5, word: 'umuwi', wrong: ['umuuwi', 'uuwi'] },
        ],
        grammar: {
          title: 'Finished actions',
          points: [
            'Tagalog verbs change with the action, not the clock: finished, still going, or not started yet.',
            'An -um- verb takes -um- after its first consonant, or in front when it starts with a vowel: kain → kumain (ate), lipat → lumipat (moved), uwi → umuwi (went home).',
            'A mag- verb turns into nag-: magtrabaho → nagtrabaho (worked), mag-asawa → nag-asawa (married).',
            'A verb about the thing done to takes -in- after its first consonant: basa → binasa (read it); before l it goes in front as ni-: luto → niluto (cooked it). An i- verb takes it too: ipanganak → ipinanganak (was born).',
          ],
          table: [['kain', 'kumain', 'ate'], ['uwi', 'umuwi', 'went home'], ['magtrabaho', 'nagtrabaho', 'worked'], ['basa', 'binasa', 'read (it)'], ['luto', 'niluto', 'cooked (it)']],
        },
        forms: [
          { prompt: 'Kahapon, ___ ako ng adobo.', root: 'luto', right: 'nagluto', wrong: ['nagluluto', 'magluluto'], en: 'Yesterday I cooked adobo.' },
          { prompt: '___ si Tatay sa opisina kaninang umaga.', root: 'punta', right: 'Pumunta', wrong: ['Pumupunta', 'Pupunta'], en: 'Dad went to the office this morning.' },
          { prompt: '___ na ba ang mga bata?', root: 'kain', right: 'Kumain', wrong: ['Kumakain', 'Kakain'], en: 'Have the kids eaten?' },
          { prompt: '___ namin ang pelikula noong Sabado.', root: 'panood', right: 'Pinanood', wrong: ['Pinapanood', 'Papanoorin'], en: 'We watched the movie on Saturday.' },
          { prompt: '___ kami ng bahay noong isang taon.', root: 'bili', right: 'Bumili', wrong: ['Bumibili', 'Bibili'], en: 'We bought a house last year.' },
          { prompt: '___ mo na ba ang sulat?', root: 'basa', right: 'Binasa', wrong: ['Binabasa', 'Babasahin'], en: 'Did you read the letter already?' },
        ],
        builds: [
          { t: 'Kumain ka na ba?', en: 'Have you eaten yet?' },
          { t: 'Lumipat kami sa Laguna noong isang taon.', en: 'We moved to Laguna last year.' },
          { t: 'Umuwi ako noong Disyembre.', en: 'I came home in December.' },
          { t: 'Nagtrabaho siya sa Dubai nang tatlong taon.', en: 'She worked in Dubai for three years.' },
        ],
        says: [
          { t: 'Ang tagal nating hindi nagkita!', en: 'We haven’t seen each other in so long!' },
          { t: 'Saan ka na nakatira ngayon?', en: 'Where do you live now?' },
          { t: 'Kailan ka umuwi?', en: 'When did you come home?' },
          { t: 'Nag-asawa ka na ba?', en: 'Have you gotten married?' },
          { t: 'Libre ko ngayon!', en: 'It’s on me this time!' },
        ],
        scenes: [
          { kind: 'What do you say?', prompt: 'You run into a friend you haven’t seen in years.', right: 'Ang tagal nating hindi nagkita!', wrong: ['Ingat ka!', 'Busog na ako.'] },
          { kind: 'What do you ask?', prompt: 'Your friend worked abroad. You want to know when she got back.', right: 'Kailan ka umuwi?', wrong: ['Saan ka pupunta?', 'Kailan ka aalis?'],
            note: '“Kailan ka aalis?” is “When will you leave?”, not yet started.' },
          { kind: 'What do you say?', prompt: 'You want to pay for your friend’s lunch.', right: 'Libre ko!', wrong: ['Bayad po!', 'Sige, ikaw na.'],
            note: '“Bayad po!” is what you say handing the fare on a jeep.' },
        ],
      },
    ],
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = COURSE;
  else (root.AMIGO_COURSES = root.AMIGO_COURSES || {}).tl2 = COURSE;
})(this);
