# ReJest — pisanie testów runtime'owych

ReJest to framework testowy działający wewnątrz aplikacji, służący do
sprawdzania **rzeczywistego** zachowania Reanimated / Worklets. W przeciwieństwie
do Jesta testy nie działają w Node na mockach — są wbudowane w
`apps/fabric-example`, wykonują się na symulatorze/emulatorze na prawdziwej
implementacji natywnej i raportują wyniki z powrotem do terminala przez
WebSocket.

I o to właśnie chodzi: ReJest widzi rzeczy, których Jest zobaczyć nie może —
każdą klatkę animacji, wartość, jaką shared value ma *na UI runtime*, oraz
wartość propa, z jaką faktycznie skończył natywny widok.

- Framework: [`ReJest/`](ReJest)
- Testy Reanimated: [`reanimated/tests/`](reanimated/tests), rejestrowane w [`reanimated/suites.ts`](reanimated/suites.ts)
- Testy Worklets: [`worklets/tests/`](worklets/tests), rejestrowane w [`worklets/suites.ts`](worklets/suites.ts)
- Publiczne API (wszystko importuj stąd): [`ReJest/RuntimeTestsApi.ts`](ReJest/RuntimeTestsApi.ts)

---

## 1. Uruchamianie testów

Z katalogu `apps/fabric-example`:

```bash
# cała biblioteka
yarn runtime-tests --library reanimated

# jeden zestaw (nazwy pochodzą z suites.ts), z ponownym użyciem zainstalowanej
# aplikacji i przypiętym symulatorem
yarn runtime-tests --library reanimated --only animations \
  --udid <SIMULATOR_UDID> --skip-build

# android
yarn runtime-tests --library reanimated --platform android --serial <ADB_SERIAL>
```

`--library` przyjmuje jedną z wartości: `reanimated`, `worklets`, `self-tests`.
`--only` przyjmuje listę **nazw `testSuiteName` najwyższego poziomu** z
`suites.ts`, rozdzieloną przecinkami — nie da się nim wskazać pojedynczego
pliku. `yarn runtime-tests --help` wypisuje wszystkie flagi.

Żeby uruchomić pojedynczy plik albo pojedynczy przypadek, użyj dekoratorów (§3) —
`describe.only` w jednym pliku pomija wszystkie pozostałe zestawy w danym
przebiegu.

Pułapki, które kosztują realny czas:

- Przypnij `--udid` / `--serial`. Kilka symulatorów nosi nazwę „iPhone 17”;
  wyszukiwanie po nazwie potrafi uruchomić jeden, a zainstalować na innym.
- Tylko jeden runner naraz. WebSocket raportujący to `metro-port + 1` i jest
  zaszyty w aplikacji, więc przebieg na iOS i na Androidzie nie mogą się
  nakładać.
- Na Androidzie ustaw wszystkie trzy skale animacji na `1`
  (`adb shell settings put global animator_duration_scale 1` oraz analogicznie
  `window_animation_scale` i `transition_animation_scale`). Przy skalach `0`
  każdy test nagrywający klatki kończy się błędem
  „Expected N snapshots, received 1”.
- `--skip-build` jest bezpieczne tylko wtedy, gdy nic nie zmieniło się po
  stronie natywnej; JS serwuje Metro.

---

## 2. Budowa pliku testowego

```tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import {
  describe, test, expectEventually, render, useTestRef, getTestComponent,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

describe('withTiming', () => {
  const REF = 'box';

  // Komponenty deklaruje się wewnątrz describe, a renderuje w teście.
  const Box = () => {
    const width = useSharedValue(0);
    const ref = useTestRef(REF);
    const style = useAnimatedStyle(() => ({ width: withTiming(width.value) }));
    React.useEffect(() => { width.value = 100; }, [width]);
    return <Animated.View ref={ref} style={[styles.box, style]} />;
  };

  test('animuje width do wartości docelowej', async () => {
    await render(<Box />);
    const box = getTestComponent(REF);
    await expectEventually(() => box.getAnimatedStyle('width')).toBe(100, ComparisonMode.PIXEL);
  });
});

const styles = StyleSheet.create({ box: { height: 50, backgroundColor: 'navy' } });
```

Rejestracja w `suites.ts`:

```ts
{
  testSuiteName: 'animations',
  importTest: () => {
    describe('*****withTiming*****', () => {
      require('./tests/animations/withTiming/basic.test');
    });
  },
  // disabled: true,      // nigdy się nie uruchamia, nawet z --only
  // skipByDefault: true, // uruchamia się tylko przy jawnym wskazaniu w --only
},
```

Runner renderuje jeden komponent testowy naraz w wydzielonym miejscu, a po każdym
przypadku wywołuje `render(null)` — nie musisz sprzątać ręcznie.

---

## 3. Struktura: `describe` / `test`

```ts
describe(name, buildSuite)          describe.only(...)   describe.skip(...)
test(name, body)                    test.only(...)       test.skip(...)   test.failing(...)
test.each(examples)(nameTemplate, (example, index) => {...})
beforeAll / afterAll / beforeEach / afterEach
```

- `test.failing` odwraca wynik: przypadek przechodzi tylko wtedy, gdy zgłosił co
  najmniej jeden błąd. Używaj do przypięcia znanego buga.
- `.only` w dowolnym miejscu przebiegu przełącza cały przebieg w tryb „only” —
  wszystko nieoznaczone jest pomijane. To praktyczny sposób na uruchomienie
  jednego pliku.
- Nazwy obsługują mały dialekt markdown renderowany jako ANSI w terminalu:
  `*kursywa*`, `**pogrubienie**`, `***inwersja***`, `_podkreślenie_`.
- Szablony nazw w `test.each` obsługują `%p` / `%s` / `%i` / `%f` (pierwsze
  wystąpienie), `%#` (indeks), `${0}` `${1}` dla przykładów tablicowych oraz
  `${klucz}` dla obiektów:

```ts
test.each([
  { velocity: 900 },
  { velocity: 900, deceleration: 0.997 },
])('Config ${0}', async (config) => { /* ... */ });
```

---

## 4. Trzy rodziny `expect`

### 4.1 `expect(value)` — natychmiastowy, synchroniczny

| Matcher | Uwagi |
| --- | --- |
| `.toBe(expected, mode?)` | `mode` to `ComparisonMode`, domyślnie `AUTO` (§5) |
| `.toBeDefined()` / `.toBeUndefined()` / `.toBeNullable()` | `toBeNullable` = `null` **lub** `undefined` |
| `.toBeWithinRange(min, max)` | przedział domknięty; koń roboczy przy animacjach opartych na fizyce |
| `.toInclude(substring)` | tylko stringi |
| `.toBeCalled(n)` / `.toBeCalledUI(n)` / `.toBeCalledJS(n)` | przyjmuje tracker z `getTrackerCallCount` (§8) |
| `await .toThrow(message?)` | **asynchroniczny — trzeba użyć `await`** (§9) |
| `.toMatchSnapshots(expected)` | klatka po klatce, ślad animacji (§7) |
| `.toMatchNativeSnapshots(native, expectNegativeMismatch?)` | aktualizacje JS vs odczyt z natywnej strony (§7) |

`.not` neguje: `expect(x).not.toBe(1)`. Nie ma wpływu na dwa matchery
snapshotowe — nie przechodzą one przez wrapper obsługujący negację.

Nieudany matcher **nie rzuca wyjątku**. Dopisuje komunikat do listy błędów
przypadku testowego, a wykonanie leci dalej — dzięki temu jeden przypadek może
zgłosić kilka błędów naraz.

### 4.2 `expectEventually(getValue, timeout?)` — odpytuje aż przejdzie

Wszystkie matchery w tej rodzinie są `async`. Wywołują `getValue()` co 32 ms,
dopóki matcher nie przejdzie albo nie minie timeout (domyślnie 10 s), a potem
raportują ostatni komunikat błędu.

```ts
await expectEventually(() => box.getAnimatedStyle('width')).toBe(50, ComparisonMode.PIXEL);
await expectEventually(() => getTrackerCallCount('onEnd')).toBeCalledUI(1);
```

Dostępne: `toBe`, `toBeWithinRange`, `toInclude`, `toBeCalled`, `toBeCalledUI`,
`toBeCalledJS`. **To właściwy sposób na asercję „animacja w końcu dochodzi do
X”** — nigdy `wait(2000)` i po nim gołe `expect`.

### 4.3 `expectSharedValue(name)` — oba runtime'y

Najpierw zarejestruj shared value wewnątrz komponentu:

```tsx
const sv = useSharedValue(0);
registerValue('mySv', sv);
```

```ts
await expectSharedValue('mySv').toBe(42);            // sprawdza OBIE kopie: JS i UI
await expectSharedValue('mySv').onJS.toBe(42);       // tylko kopia z runtime'u JS
await expectSharedValue('mySv').onUI.toBe(42);       // odczytuje wartość na UI runtime
await expectSharedValue('mySv').toConverge(42, ComparisonMode.NUMBER, 1000); // odpytuje kopię JS
```

Wszystkie są `async`. `getSharedValue(name)` zwraca surową wartość po stronie
JS, jeśli potrzebujesz jej do obliczeń, a nie do asercji.

---

## 5. Tryby porównania — co znaczy „równe”

`ComparisonMode` z [`ReJest/types.ts`](ReJest/types.ts), implementacja w
[`ReJest/matchers/Comparators.ts`](ReJest/matchers/Comparators.ts):

| Tryb | Reguła |
| --- | --- |
| `NUMBER` | ścisłe `===` (liczby albo bigint); `NaN` równa się `NaN` |
| `FLOAT` | `\|a − b\| < Number.EPSILON` |
| `FLOAT_DISTANCE` | `\|a − b\| < 1e-5` |
| `PIXEL` | `\|a − b\| < 0.5` |
| `STRING` | ścisłe `===`, obie wartości muszą być stringami |
| `COLOR` | porównanie percepcyjne, „wystarczająco blisko” |
| `ARRAY` / `OBJECT` | rekurencyjne, długość / liczba kluczy musi się zgadzać |
| `AUTO` | liczba → `PIXEL`, string → `STRING`, tablica → `ARRAY`, obiekt → `OBJECT` |

**`AUTO` dla liczb oznacza tolerancję pół piksela, a nie równość.** Jeśli chcesz
dokładnej równości liczb, przekaż jawnie `ComparisonMode.NUMBER`.

Propy z przypisanym na stałe trybem (używane przez snapshoty oraz przez `AUTO`
wewnątrz obiektów):

| Prop | Tryb |
| --- | --- |
| `width`, `height`, `top`, `left` | `PIXEL` |
| `opacity` | `FLOAT_DISTANCE` |
| `zIndex` | `NUMBER` |
| `backgroundColor` | `COLOR` |
| `boxShadow` | `ARRAY` |

Te osiem nazw to jednocześnie jedyne propy możliwe do odczytania po stronie
natywnej (`isValidPropName`), co ogranicza zakres snapshotów natywnych. Przy
porównaniach natywnych dla `top`/`left`/`width`/`height` tolerancja jest
poszerzana, żeby uwzględnić zaokrąglanie do siatki pikseli w Yodze.

---

## 6. Odczytywanie wartości z działającej aplikacji

Są cztery kanały; wybierz najsłabszy, który wystarczy do udowodnienia tezy.

**Shared values** — `registerValue` + `expectSharedValue` / `getSharedValue`.
Najlepsze do czystego zachowania API Worklets, bez udziału widoku.

**Żywy prop natywny** — `useTestRef(name)` w komponencie, a potem w teście:

```ts
const component = getTestComponent(name);
await component.getAnimatedStyle('width'); // async, czyta prop z natywnego widoku
component.getStyle('width');               // prop tak, jak przekazał go React
component.getTag();                        // tag natywnego widoku
```

`getAnimatedStyle` jest źródłem prawdy dla pytania „gdzie animacja faktycznie
skończyła”. Przyjmuje wyłącznie osiem prawidłowych nazw propów wymienionych
wyżej.

**Cały ślad animacji** — nagraj każde wywołanie `_updateProps`:

```ts
await mockAnimationTimer();                    // zamrożenie czasu: dokładnie 16 ms na klatkę
const updates = await recordAnimationUpdates();
await render(<MyComponent />);
await waitForAnimationUpdates(expectedFrameCount);

const jsFrames     = await updates.getUpdates();          // [{left: 0}, {left: 14.35}, ...]
const nativeFrames = await updates.getNativeSnapshots();  // te same klatki odczytane z natywnej strony
await unmockAnimationTimer();
```

`getUpdates(component?, propNames?)` — bez argumentu wymaga, żeby animowany był
dokładnie jeden widok, inaczej rzuca „Recorded snapshots of many views”. Przekaż
`TestComponent` (albo surowy tag, przydatne po odmontowaniu widoku), żeby wybrać
jeden, oraz `propNames`, żeby zawęzić zestaw propów.

`mockAnimationTimer()` jest obowiązkowy przed `waitForAnimationUpdates` —
podmienia `__nativeRequestAnimationFrame` tak, że każda klatka przesuwa
timestamp dokładnie o 16 ms, i to właśnie czyni ślady klatek powtarzalnymi.
Zawsze paruj go z `unmockAnimationTimer()` (runner odmockowuje także podczas
sprzątania).

**Callbacki i kolejność** — patrz §8.

---

## 7. Testowanie animacji snapshotami

```ts
expect(jsFrames).toMatchSnapshots(Snapshots.myCase);   // vs ślad wersjonowany w repo
expect(jsFrames).toMatchNativeSnapshots(nativeFrames); // aktualizacje JS vs odczyt natywny
```

Snapshoty leżą w sąsiednim pliku `*.snapshot.ts`, który eksportuje jeden obiekt
kluczowany nazwą przypadku, np.
[`animations/withDecay/basic.snapshot.ts`](reanimated/tests/animations/withDecay/basic.snapshot.ts).

Co jest faktycznie sprawdzane:

- **Dokładna liczba klatek.** Dla `toMatchSnapshots` długości muszą być
  identyczne; nieaktualny snapshot kończy się błędem
  `Expected 65 snapshots, but received 66`. Dla `toMatchNativeSnapshots`
  dopuszczalna jest różnica jednej klatki, bo snapshoty natywne są o klatkę
  opóźnione względem aktualizacji JS.
- **Każda klatka poza ostatnią**, prop po propie, z użyciem trybu przypisanego
  danemu propowi (czyli `left` porównywane z tolerancją 0,5 px). Pętla to
  `i < captured.length - 1` — końcowa wartość spoczynkowa **nie jest**
  porównywana. Jeśli punkt końcowy ma znaczenie (granica clampu, końcowe
  `opacity: 0`), sprawdź go osobno przez `expectEventually(...).toBe(...)`.
- Sprawdzane są tylko klucze obecne w klatce **nagranej**, więc prop, który
  zniknął z aktualizacji, nie zostałby wychwycony; to kontrola liczby klatek
  wyłapuje większość rozjazdów.

Jak wygenerować snapshot: napisz test, uruchom go i skopiuj nagraną tablicę z
wyniku błędu — nie ma flagi `--update-snapshots`.

**Kiedy nie używać snapshotów.** Są wrażliwe na dokładną długość i zależne od
maszyny, i to one są głównym źródłem flakiness w tym zestawie. Dla wszystkiego,
co opiera się na sprężynach, gestach albo zachowaniu zależnym od platformy, lepsze
są asercje strukturalne na nagranych klatkach — monotoniczność, pierwsza/ostatnia
wartość, liczba klatek w przedziale:

```ts
expect(frames.length).toBeWithinRange(20, 40);
expect(frames[0].opacity).toBeWithinRange(0, 0.5);
expect(isMonotonic(frames.map(f => f.opacity), 'up')).toBe(true);
expect(frames.at(-1).left).toBe(150, ComparisonMode.PIXEL);
```

---

## 8. Callbacki, powiadomienia, kolejność

**Czy callback się wywołał i na którym runtimie?**

```tsx
// w worklecie albo po stronie JS:
callTracker('onEndCalled');
const onEnd = callTrackerFn('onEndCalled'); // zwraca worklet, który liczy wywołania
```

```ts
const calls = await getTrackerCallCount('onEndCalled');
expect(calls).toBeCalled(1);    // JS + UI łącznie
expect(calls).toBeCalledUI(1);  // tylko UI runtime
expect(calls).toBeCalledJS(0);
```

Liczniki są resetowane przed każdym przypadkiem testowym.

**Czekanie, aż coś się wydarzy** — `notify` z dowolnego miejsca (JS lub worklet),
`waitForNotification` w teście:

```tsx
withTiming(100, {}, (finished) => { 'worklet'; notify('done'); });
```

```ts
await waitForNotification('done');                 // domyślny timeout 10 s
await waitForNotifications(['a', 'b'], 5000);      // wszystkie naraz
```

To poprawny sposób synchronizacji z callbackiem animacji. Powiadomienia również
są resetowane per przypadek testowy.

**Przechwycenie wartości z workleta** — `createTestValue` zwraca pudełko na stan
oraz setter bezpieczny w worklecie, który przeskakuje na JS i przy okazji może
wysłać powiadomienie:

```ts
const [finished, setFinished] = createTestValue<boolean>(false);
const callback = (isFinished: boolean) => {
  'worklet';
  setFinished(isFinished, 'animationDone'); // drugi argument = nazwa powiadomienia
};
// ...
await waitForNotification('animationDone');
expect(finished.value).toBe(true);
```

**Asercja kolejności wykonania** — `createOrderConstraint()` to `createTestValue`
z setterem, który przyjmuje wyłącznie ściśle rosnące, kolejne liczby, a przy
pierwszym wywołaniu poza kolejnością zatrzaskuje się na `-1`:

```ts
const [order, markOrder] = createOrderConstraint();
// wywołuj markOrder(1, 'first'), markOrder(2, 'second'), ... z callbacków
await waitForNotifications(['first', 'second']);
expect(order.value).toBe(2); // -1 albo zablokowana wartość oznacza złą kolejność
```

---

## 9. Asercje błędów i ostrzeżeń

```ts
await expect(() => { doSomethingInvalid(); }).toThrow('fragment oczekiwanego komunikatu');
await expect(async () => { await thing(); }).not.toThrow();
```

`toThrow` jest `async` — **pominięcie `await` powoduje ciche przejście testu**.
Liczy rzucony wyjątek, nieprzechwycony błąd przechodzący przez `ErrorUtils` *albo*
`console.error` / `console.warn` na dowolnym runtimie, więc działa też dla
deweloperskich ostrzeżeń Reanimated. Na błąd asynchroniczny czeka do 500 ms.

---

## 10. Czekanie: dobór właściwego mechanizmu

| Potrzeba | Użyj |
| --- | --- |
| Wartość ma osiągnąć jakiś stan | `expectEventually(getter).toBe(...)` |
| Callback ma się wywołać | `notify` + `waitForNotification` |
| N nagranych klatek animacji (zamockowany timer) | `waitForAnimationUpdates(n)` |
| N faktycznie wyrenderowanych klatek | `waitForFrames(n, timeout?)` |
| Wartość ma przestać się zmieniać | `waitUntilSettled(read, { stableFrames: 2, timeout })` |
| Nie ma nic lepszego | `wait(ms)` — ostateczność |

`wait(ms)` to zwykły sleep i najczęstsza przyczyna flakiness. Sięgaj po niego
tylko przy asercji, że coś się *nie* dzieje, i łącz go z wyścigiem:

```ts
await Promise.race([waitForNotification('shouldNotFire'), wait(1000)]);
expect(await getTrackerCallCount('shouldNotFire')).toBeCalled(0);
```

---

## 11. Mockowanie

- `mockAnimationTimer()` / `unmockAnimationTimer()` — deterministyczne klatki co
  16 ms; wymagane przy asercjach opartych na liczbie klatek i przy snapshotach.
- `mockWindowDimensions()` / `unmockWindowDimensions()` — mimo nazwy nie mockuje
  `Dimensions`, tylko podmienia `LayoutAnimationsManager.start` tak, aby wstrzykiwał
  stałe `windowWidth: 393, windowHeight: 852` do wartości yogi przekazywanych do
  animacji layoutu. Dzięki temu animacje wejścia/wyjścia zależne od rozmiaru
  ekranu dają te same liczby na każdym urządzeniu.
- `getWorkletRuntimesFromPool(count)` — reużywa nazwane worklet runtime'y między
  testami, zamiast tworzyć nowy na każdy przypadek.
- `Presets` — duże zestawy wartości brzegowych (`Presets.numbers`, `.strings`,
  `.bigInts`, `.serializableObjects`, `.arrays`, `.dates`, …), pomyślane do
  wrzucenia wprost w `test.each` przy testach serializacji i API.

---

## 12. Checklista dla nowego testu

1. Umieść plik obok pokrewnych, w `reanimated/tests/…`, z nazwą `*.test.tsx`.
2. Importuj wszystko z `ReJest/RuntimeTestsApi`, a `ComparisonMode` z
   `ReJest/types`.
3. Zadeklaruj komponent wewnątrz `describe`; dodaj `useTestRef`, jeśli test musi
   czytać natywne propy.
4. `await render(...)` — zawsze z `await`.
5. Synchronizuj się powiadomieniem albo `expectEventually`, nie sleepem.
6. Sprawdzaj najsłabszą rzecz, która dowodzi zachowania; preferuj
   `toBeWithinRange` / kontrolę punktów końcowych niż pełny snapshot klatek.
7. Zarejestruj plik w `suites.ts`.
8. Uruchom go dwa razy. Jeśli wynik zmienia się między przebiegami, test jest
   zależny od czasu — napraw to przed commitem.

## 13. Pułapki

- `await` przy: `toThrow`, każdym matcherze `expectEventually`, każdym matcherze
  `expectSharedValue`, `getAnimatedStyle`, `getTrackerCallCount`,
  `getSharedValue` oraz `getUpdates`. Brak `await` zwykle oznacza, że asercja w
  ogóle się nie wykonała, a test przeszedł.
- Matchery nie rzucają wyjątków. Test nie „przejdzie” po nieudanym matcherze —
  ale przypadek, który sam z siebie zrobi wczesny `return`, po cichu pominie
  asercje, więc unikaj warunkowych `return` w ciele przypadku.
- `getUpdates()` bez argumentu rzuca wyjątek, gdy animowany był więcej niż jeden
  widok.
- `waitForAnimationUpdates` bez `mockAnimationTimer()` rzuca
  „Seems that you've forgot to call `mockAnimationTimer()`”.
- Ze strony natywnej da się odczytać tylko osiem propów z §5; wszystko inne trzeba
  sprawdzać przez shared values albo aktualizacje po stronie JS.
- Pozostawione w commicie `.only` po cichu pomija resztę biblioteki.
