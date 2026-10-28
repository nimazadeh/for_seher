/**
 * Application Configuration — Personalization, Audio, Theme & Bilingual Copy
 */

export const APP_CONFIG = {
  recipientName: 'Seher',
  senderName: 'Ali',
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'de'],
  defaultTheme: 'dark-liquid',
  wishAwakensTheme: 'seher-dawn',

  audio: {
    autoStartOnFirstTap: true,
    customTrackUrl: './assets/music.mp3',
    // Official Apple Music DE public chorus stream for Shirin David - "Brillis" (SUPERSIZE)
    itunesLookupUrl: 'https://itunes.apple.com/lookup?id=1803425806&country=DE',
    fallbackPreviewUrl:
      'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/55/4f/58/554f58ad-c209-79e2-5df7-f4c366467508/mzaf_15624992951703979478.plus.aac.p.m4a',
    songVolume: 0.2,
    masterVolume: 0.56
  },

  wishHoldDurationMs: 2200,

  translations: {
    en: {
      metaTitle: 'Happy Birthday, Seher ✦',
      hud: {
        langGroupLabel: 'Language selector',
        soundOn: 'Sound',
        soundOff: 'Muted',
        soundAriaLabel: 'toggle birthday music',
        step1Aria: 'Welcome invitation',
        step2Aria: 'Hold finger to unlock birthday note',
        step3Aria: 'Birthday note and keepsake'
      },
      act1: {
        title: 'Happy Birthday, Seher',
        subtitle:
          'Today belongs to someone truly wonderful—here’s a small birthday surprise made just to make you smile.',
        cta: 'Open Your Surprise'
      },
      act2: {
        eyebrow: 'Touch & Hold',
        title: 'Make a Wish, Seher',
        subtitleIdle:
          'Place your finger on the light and hold for a moment to awaken the sunrise and unlock Ali’s note.',
        subtitleHolding: 'Keep holding… awakening the sunrise & unlocking your note…',
        subtitleDone: 'Unlocked—here is Ali’s note for you, Seher.',
        statusIdle: 'Hold finger for 2s',
        statusHolding: 'Unlocking…',
        statusDone: 'Note unlocked ✦',
        orbAriaLabel: 'Press and hold for two seconds to unlock your birthday note'
      },
      act3: {
        envelopeBadge: 'A Letter From Ali',
        envelopeHint: 'Tap the gold seal to open your letter',
        envelopeAria: 'Open Ali’s birthday letter',
        passFor: 'Celebrated Today',
        passName: 'Seher',
        passFooter: 'Crafted von Herzen by Ali',
        skyToggleDawn: '✦ Sunrise Sky',
        skyToggleNight: '✦ Midnight Sky',
        openNoteBtn: 'Read Ali’s Note',
        replayBtn: 'Replay Surprise'
      },
      sheet: {
        badge: 'A Birthday Note • From Ali',
        closeAria: 'Minimize birthday note',
        salutation: 'For Seher',
        p1: 'I couldn’t let today pass with just an ordinary “Happy Birthday,” because a best friend like you deserves a little more thought and effort than that.',
        p2: 'Honestly, I’m really glad we became friends. You’re such a kind, warm-hearted, and honest person, and those are qualities I genuinely appreciate about you. You have a rare way of making people feel comfortable just by being yourself.',
        p3: 'Thank you for being such a great best friend—for the laughs we share, the conversations we enjoy, and a friendship where we can simply be ourselves.',
        p4: 'I hope today is filled with delicious food, lovely surprises, and people who remind you how much you’re appreciated. May the year ahead bring you and your family good health, peace, beautiful memories, and countless reasons to laugh together.',
        p5: 'Thank you for being you, Seher. Have the wonderful birthday you truly deserve, and a bright, happy year ahead.',
        signoffCaption: 'Happy Birthday',
        signature: '— Ali',
        viewPassBtn: 'Keepsake Pass'
      }
    },

    de: {
      metaTitle: 'Alles Gute zum Geburtstag, Seher ✦',
      hud: {
        langGroupLabel: 'Sprache auswählen',
        soundOn: 'Ton',
        soundOff: 'Stumm',
        soundAriaLabel: 'Geburtstagsmusik umschalten',
        step1Aria: 'Einladung zum Geburtstag',
        step2Aria: 'Finger halten zum Öffnen der Nachricht',
        step3Aria: 'Geburtstagsnachricht und Erinnerungskarte'
      },
      act1: {
        title: 'Alles Gute zum Geburtstag, Seher',
        subtitle:
          'Heute gehört der Tag einem wirklich wundervollen Menschen – hier wartet eine kleine Überraschung, nur um dir ein Lächeln zu schenken.',
        cta: 'Überraschung öffnen'
      },
      act2: {
        eyebrow: 'Berühren & Halten',
        title: 'Wünsch dir was, Seher',
        subtitleIdle:
          'Leg deinen Finger auf das Licht und halte kurz gedrückt, um das Morgenrot und Alis Nachricht zu öffnen.',
        subtitleHolding: 'Weiter halten… Morgenrot & deine Nachricht öffnen sich…',
        subtitleDone: 'Geöffnet – hier ist Alis Nachricht für dich, Seher.',
        statusIdle: '2 Sek. gedrückt halten',
        statusHolding: 'Wird geöffnet…',
        statusDone: 'Nachricht offen ✦',
        orbAriaLabel: 'Zwei Sekunden gedrückt halten, um deine Geburtstagsnachricht zu öffnen'
      },
      act3: {
        envelopeBadge: 'Ein Brief von Ali',
        envelopeHint: 'Tippe auf das goldene Siegel, um den Brief zu öffnen',
        envelopeAria: 'Alis Geburtstagsbrief öffnen',
        passFor: 'Heute gefeiert',
        passName: 'Seher',
        passFooter: 'Von Herzen gemacht von Ali',
        skyToggleDawn: '✦ Morgenrot',
        skyToggleNight: '✦ Sternennacht',
        openNoteBtn: 'Alis Nachricht lesen',
        replayBtn: 'Nochmal erleben'
      },
      sheet: {
        badge: 'Geburtstagsnotiz • Von Ali',
        closeAria: 'Nachricht minimieren',
        salutation: 'Für Seher',
        p1: 'Ich konnte deinen Ehrentag unmöglich nur mit einem einfachen „Alles Gute zum Geburtstag“ vorbeigehen lassen – denn so eine großartige beste Freundin wie du hat definitiv ein bisschen mehr Mühe und Aufmerksamkeit verdient.',
        p2: 'Ganz ehrlich: Ich bin richtig froh, dass wir befreundet sind. Du bist so ein lieber, warmherziger und aufrichtiger Mensch – und genau das schätze ich so sehr an dir. Du hast diese seltene Art, dass man sich bei dir sofort wohlfühlt, einfach indem du ganz du selbst bist.',
        p3: 'Danke, dass du so eine tolle beste Freundin bist – für unser gemeinsames Lachen, die schönen Gespräche und eine Freundschaft, in der wir einfach wir selbst sein können.',
        p4: 'Ich hoffe, dein heutiger Tag ist voller leckerem Essen, schöner Überraschungen und Menschen, die dich spüren lassen, wie sehr du geschätzt wirst. Möge das kommende Jahr dir und deiner Familie Gesundheit, innere Ruhe, wunderschöne Erinnerungen und unzählige gemeinsame Momente voller Lachen schenken.',
        p5: 'Danke, dass es dich gibt, Seher. Hab genau den wundervollen Geburtstag, den du verdienst, und ein strahlendes, glückliches neues Lebensjahr.',
        signoffCaption: 'Alles Gute zum Geburtstag',
        signature: '— Ali',
        viewPassBtn: 'Geburtstags-Pass'
      }
    }
  }
};
