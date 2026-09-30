// Amigo · Kaibigan: Tagalog, Blake's mission language (the Philippines,
// 2002–2004). Blake checks every Tagalog line: a unit shows on the live app
// only once it has `checked` (the date he did), and so do the words on the
// home screen and the Baybayin reading words. The test site shows them all,
// marked. The rules are in amigo/README.md; tools/test-amigo.mjs checks them.
(function (root) {
  'use strict';

  const COURSE = {
    id: 'tl',
    name: 'Tagalog',
    who: 'Tatay’s mission language',
    voices: ['fil-PH', 'fil', 'tl-PH', 'tl'],
    praise: ['Tama!', 'Magaling!', 'Ang galing!'],
    units: [
      {
        id: 'kumustahan', title: 'Kumustahan', sub: 'Greetings',
        blurb: 'Greetings with po and opo, and what the neighbors always ask.',
        done: 'Magaling!', doneNote: '“Magaling!” means “Well done!”',
        phrases: [
          { t: 'Kumusta ka?', en: 'How are you? (to a friend)', wrong: ['Where are you going?', 'Have you eaten?'] },
          { t: 'Kumusta po kayo?', en: 'How are you? (to an elder)', wrong: ['Thank you. (to an elder)', 'Where are you going? (to an elder)'],
            note: '“Po” and “kayo” show respect to someone older.' },
          { t: 'Mabuti naman po.', en: 'I’m doing well. (to an elder)', wrong: ['Thank you. (to an elder)', 'Take care. (to an elder)'] },
          { t: 'Salamat po.', en: 'Thank you. (to an elder)', wrong: ['You’re welcome.', 'Good morning.'] },
          { t: 'Walang anuman.', en: 'You’re welcome.', wrong: ['Thank you.', 'Nothing’s wrong.'] },
          { t: 'Opo.', en: 'Yes. (to an elder)', wrong: ['No. (to an elder)', 'Okay, bye.'] },
          { t: 'Hindi po.', en: 'No. (to an elder)', wrong: ['Yes. (to an elder)', 'Not yet.'] },
          { t: 'Magandang umaga po.', en: 'Good morning. (to an elder)', wrong: ['Good evening.', 'Good afternoon.'] },
          { t: 'Magandang gabi po.', en: 'Good evening. (to an elder)', wrong: ['Good morning.', 'Good afternoon.'] },
          { t: 'Mano po.', en: 'Your blessing, please. (greeting an elder)', wrong: ['Hands up, please.', 'Thank you for the food.'],
            note: 'You say it as you take an elder’s hand and touch it to your forehead: the mano.' },
          { t: 'Saan ka pupunta?', en: 'Where are you going?', wrong: ['Where do you live?', 'How are you?'],
            note: 'Every neighbor on the street asks it. “Diyan lang” (just over there) is the usual answer.' },
          { t: 'Diyan lang.', en: 'Just over there.', wrong: ['Right here.', 'Far away.'] },
          { t: 'Ingat!', en: 'Take care!', wrong: ['Let’s go!', 'Let’s eat!'] },
          { t: 'Sige!', en: 'Okay, see you!', wrong: ['Thank you!', 'Not yet!'] },
        ],
        words: [['oo', 'yes'], ['hindi', 'no'], ['salamat', 'thanks'], ['kaibigan', 'friend'], ['umaga', 'morning'], ['tanghali', 'noon'],
          ['hapon', 'afternoon'], ['gabi', 'evening'], ['lola', 'grandma'], ['lolo', 'grandpa'], ['kapitbahay', 'neighbor'], ['paalam', 'goodbye']],
        scenes: [
          { kind: 'What do you answer?', prompt: 'An older neighbor asks you, “Kumusta ka?”', right: 'Mabuti naman po.', wrong: ['Salamat po.', 'Ingat po.'],
            note: '“Mabuti naman po” is “I’m doing well.” The po keeps it respectful.' },
          { kind: 'What do you answer?', prompt: 'Your friend says, “Salamat!”', right: 'Walang anuman.', wrong: ['Salamat po.', 'Hindi po.'] },
          { kind: 'What do you say?', prompt: 'It’s eight in the morning, and you meet your friend’s grandpa.', right: 'Magandang umaga po.', wrong: ['Magandang gabi po.', 'Walang anuman.'] },
          { kind: 'What do you say?', prompt: 'You get to Lola’s house and take her hand.', right: 'Mano po.', wrong: ['Walang anuman.', 'Sige!'] },
          { kind: 'What do you answer?', prompt: 'A friend on the street asks, “Saan ka pupunta?”', right: 'Diyan lang.', wrong: ['Opo.', 'Magandang gabi po.'] },
        ],
      },
      {
        id: 'kain-tayo', title: 'Kain tayo', sub: 'Let’s eat',
        blurb: 'Food words, and what every lola asks.',
        done: 'Busog na!', doneNote: '“Busog na ako” means “I’m full.”',
        phrases: [
          { t: 'Kain tayo!', en: 'Let’s eat!', wrong: ['Let’s go!', 'Let’s sing!'],
            note: 'Filipinos say it to anyone nearby when they sit down to eat.' },
          { t: 'Kumain ka na ba?', en: 'Have you eaten yet?', wrong: ['Are you hungry?', 'Is it good?'],
            note: 'It’s also a way to say hello.' },
          { t: 'Kumain na ako.', en: 'I already ate.', wrong: ['I’m hungry.', 'Let’s eat.'] },
          { t: 'Hindi pa po.', en: 'Not yet. (to an elder)', wrong: ['Yes. (to an elder)', 'No, thanks.'] },
          { t: 'Gutom na ako.', en: 'I’m hungry.', wrong: ['I’m full.', 'I’m tired.'] },
          { t: 'Busog na ako.', en: 'I’m full.', wrong: ['I’m hungry.', 'I’m done playing.'] },
          { t: 'Ang sarap!', en: 'So good! (it tastes great)', wrong: ['So hot!', 'So much!'] },
          { t: 'Pahingi po ng tubig.', en: 'May I have some water, please?', wrong: ['May I have some rice, please?', 'Please pass the milk.'] },
          { t: 'Pakiabot po ng kanin.', en: 'Please pass the rice.', wrong: ['Please cook the rice.', 'May I have some water?'] },
          { t: 'Ano ang ulam?', en: 'What are we eating with the rice?', wrong: ['Where is the rice?', 'Who cooked?'],
            note: '“Ulam” is whatever you eat with your rice: adobo, fish, vegetables.' },
          { t: 'Masarap po.', en: 'It’s delicious. (to an elder)', wrong: ['It’s hot. (to an elder)', 'I’m full. (to an elder)'] },
          { t: 'Salamat po sa pagkain.', en: 'Thank you for the food. (to an elder)', wrong: ['Thank you for coming.', 'Let’s eat.'] },
        ],
        words: [['kanin', 'rice (cooked)'], ['tubig', 'water'], ['gatas', 'milk'], ['tinapay', 'bread'], ['itlog', 'egg'], ['manok', 'chicken'],
          ['isda', 'fish'], ['saging', 'banana'], ['mangga', 'mango'], ['pansit', 'noodles'], ['kutsara', 'spoon'], ['tinidor', 'fork']],
        scenes: [
          { kind: 'What do you answer?', prompt: 'You haven’t eaten yet, and Lola asks, “Kumain ka na ba?”', right: 'Hindi pa po.', wrong: ['Busog na ako.', 'Masarap po.'] },
          { kind: 'What do you say?', prompt: 'You finished a big plate and can’t eat any more.', right: 'Busog na ako.', wrong: ['Gutom na ako.', 'Kain tayo!'] },
          { kind: 'What do you say?', prompt: 'The adobo tastes amazing.', right: 'Ang sarap!', wrong: ['Busog na ako.', 'Walang anuman.'] },
          { kind: 'What do you ask?', prompt: 'You’re thirsty at Lola’s table.', right: 'Pahingi po ng tubig.', wrong: ['Pakiabot po ng kanin.', 'Ano ang ulam?'] },
          { kind: 'What do you say?', prompt: 'Dinner is over, and you thank the cook.', right: 'Salamat po sa pagkain.', wrong: ['Kain tayo!', 'Gutom na ako.'] },
        ],
      },
    ],
    // On the home screen: a few words from Tatay.
    tatay: {
      words: [['Tatay', 'Dad'], ['Nanay', 'Mom'], ['Anak', 'My child'], ['Mahal kita', 'I love you'], ['Salamat po', 'Thank you'], ['Kaibigan', 'Friend']],
    },
    // Baybayin's reading words, spelled as they're said.
    baybayin: {
      words: [['ama', 'father'], ['kama', 'bed'], ['bata', 'child'], ['tama', 'right, correct'], ['mata', 'eye'], ['taba', 'fat'],
        ['sala', 'living room'], ['gata', 'coconut milk'], ['tasa', 'cup'], ['lata', 'can'], ['masa', 'dough'], ['baga', 'lungs'],
        ['paa', 'foot'], ['daga', 'mouse'], ['wala', 'none'], ['saya', 'joy'], ['haba', 'length'], ['dalaga', 'young woman'], ['yaya', 'nanny'],
        ['puso', 'heart'], ['kita', 'you'], ['bibe', 'duck'], ['lolo', 'grandpa'], ['lola', 'grandma'], ['kuya', 'big brother'], ['ate', 'big sister'],
        ['mesa', 'table'], ['kape', 'coffee'], ['bola', 'ball'], ['ulo', 'head'], ['pusa', 'cat'], ['aso', 'dog'],
        ['tatay', 'dad'], ['nanay', 'mom'], ['anak', 'child (son or daughter)'], ['salamat', 'thank you'], ['tubig', 'water'], ['kaibigan', 'friend'],
        ['mabuhay', 'long live! welcome!'], ['bahay', 'house'], ['araw', 'sun, day'], ['buwan', 'moon, month'], ['isda', 'fish'], ['kain', 'eat'],
        ['ilog', 'river'], ['manok', 'chicken']],
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = COURSE;
  else (root.AMIGO_COURSES = root.AMIGO_COURSES || {}).tl = COURSE;
})(this);
