/**
 * 영한번역 영어 학습 웹앱 - 기본 학습 데이터 (Elon Musk & Rishi Sunak AI Interview)
 * 
 * [초정밀 4단계 학습 설계]
 * 1. words: 중요 단어 및 숙어
 * 2. structure: 직독직해 및 문장 구조 분석 (Chunking)
 * 3. mustMemorize: 필수 암기 포인트 (핵심 문법 및 핵심 뉘앙스)
 * 4. pattern: 실전 회화 응용 패턴 및 영작 팁
 */
const DEFAULT_STUDY_DATA = [
  {
    id: "sunak_01",
    speaker: "Rishi Sunak",
    en: "Well, good evening everybody. Welcome Elon, thanks for being here.",
    ko: "여러분, 좋은 저녁입니다. 일론, 환영합니다. 이 자리에 와주셔서 감사합니다.",
    notes: {
      words: [
        { word: "everybody", meaning: "여러분, 모든 사람" },
        { word: "welcome", meaning: "환영하다, 반기다" },
        { word: "thanks for", meaning: "~에 대해 감사하다" }
      ],
      structure: "• <strong>Well, good evening everybody</strong> (자, 모두들 좋은 저녁입니다) / <strong>Welcome Elon</strong> (일론 환영합니다) / <strong>thanks for being here</strong> (여기에 자리해 주셔서 감사합니다)",
      mustMemorize: "• <strong>thanks for + 동명사(-ing)</strong>: 상대방의 구체적인 행동에 고마움을 표시할 때 가장 널리 쓰이는 형태입니다. 'being here'는 '여기에 존재하는 것(참석한 것)'을 뜻합니다.",
      pattern: "• <strong>Thanks for -ing [동사원형-ing]</strong><br>  - 활용 예: Thanks for helping me. (나를 도와줘서 고마워.)<br>  - 활용 예: Thanks for inviting me. (나를 초대해줘서 고마워.)"
    }
  },
  {
    id: "musk_01",
    speaker: "Elon Musk",
    en: "Thank you for having me.",
    ko: "초대해 주셔서 감사합니다.",
    notes: {
      words: [
        { word: "thank you for", meaning: "~에 대해 감사합니다" },
        { word: "have", meaning: "(손님 등을) 초대하다, 대접하다" }
      ],
      structure: "• <strong>Thank you</strong> (감사합니다) / <strong>for having me</strong> (저를 손님으로 초대해 주신 것에 대해)",
      mustMemorize: "• <strong>Thank you for having me</strong>: 방송 출연, 파티 초대, 인터뷰 등에서 초대받은 손님이 호스트에게 전하는 고정된 정형 구문입니다. 반드시 통째로 암기해야 합니다.",
      pattern: "• <strong>Thank you for having [사람]</strong><br>  - 활용 예: Thank you for having us tonight. (오늘 밤 저희를 초대해 주셔서 감사해요.)"
    }
  },
  {
    id: "sunak_02",
    speaker: "Rishi Sunak",
    en: "We feel, we feel very privileged. We're excited to have you. Right. So I'm going to start with some questions and then we're going to open it up. Let me get straight into it. So Bill Gates said, \"There is no one in our time who has done more to push the bounds of science innovation than you.\"",
    ko: "저희가 오히려 큰 영광입니다. 함께하게 되어 매우 기쁩니다. 좋습니다, 그럼 제가 몇 가지 질문으로 시작하고 나중에 (질문 기회를) 개방하도록 하겠습니다. 바로 본론으로 들어가 보죠. 빌 게이츠는 이렇게 말했습니다. \"우리 시대에 당신보다 과학 혁신의 한계를 밀어붙이기 위해 더 많은 일을 한 사람은 없다\"라고요.",
    notes: {
      words: [
        { word: "privileged", meaning: "영광스러운, 특권을 가진" },
        { word: "excited", meaning: "신나는, 매우 기쁜" },
        { word: "bounds", meaning: "경계, 영역의 한계" },
        { word: "innovation", meaning: "혁신, 획기적인 것" }
      ],
      structure: "• <strong>We feel very privileged</strong> (우리는 대단히 영광스럽게 생각합니다) / <strong>We're excited to have you</strong> (당신을 모시게 되어 무척 설렙니다) / <strong>So I'm going to start with some questions</strong> (그래서 몇 가지 질문으로 시작하겠습니다) / <strong>and then we're going to open it up</strong> (그리고 나중에 질의응답을 개방하겠습니다) / <strong>Let me get straight into it</strong> (바로 본론으로 들어가 보겠습니다) / <strong>There is no one in our time</strong> (우리 시대에 아무도 없다) / <strong>who has done more to push the bounds... than you</strong> (당신보다 과학 혁신의 한계를 밀어붙이기 위해 더 많은 일을 한 사람은)",
      mustMemorize: "• <strong>There is no one who + 비교급 + than A</strong>: 'A보다 더 ~한 사람은 없다'라는 구조로, 실제로는 <strong>A가 가장 ~하다(최상급)</strong>를 표현하는 영어 특유의 세련된 문장 구조입니다.<br>• <strong>Let me + 동사원형</strong>: '제가 ~하겠습니다'라며 청자의 동의나 양해를 구하는 부드럽고 주도적인 표현입니다.",
      pattern: "• <strong>Let me get straight into [명사]</strong><br>  - 활용 예: Let me get straight into the details. (상세 내용으로 바로 들어가 보겠습니다.)<br>• <strong>There is no one who [동사] more than [사람]</strong><br>  - 활용 예: There is no one who loves you more than I do. (너를 나보다 더 사랑하는 사람은 없어.)"
    }
  },
  {
    id: "musk_02",
    speaker: "Elon Musk",
    en: "Well, that's kind of... Well, that's a nice thing to have anyone say about you. Nice coming from Bill Gates.",
    ko: "누군가 나에 대해 그렇게 말해준다는 건 참 기분 좋은 일이죠. 빌 게이츠가 그렇게 말해주니 더 좋네요.",
    notes: {
      words: [
        { word: "kind of", meaning: "어느 정도, 말하자면" },
        { word: "nice", meaning: "좋은, 다정한" },
        { word: "say about", meaning: "~에 대해 말하다" }
      ],
      structure: "• <strong>Well, that's kind of...</strong> (음, 그건 뭐랄까...) / <strong>that's a nice thing</strong> (그건 아주 기분 좋은 말입니다) / <strong>to have anyone say about you</strong> (누군가가 나에 대해 그렇게 얘기해 준다는 것은) / <strong>Nice coming from Bill Gates</strong> (빌 게이츠의 입에서 나온 칭찬이라서 더 멋지네요)",
      mustMemorize: "• <strong>to have anyone say</strong>: 'have'는 사역동사로 '목적어(anyone) + 동사원형(say)'를 취해 '누군가가 나에 대해 칭찬을 하도록 시키다/겪다'라는 복합적인 뉘앙스를 지닙니다.<br>• <strong>Nice coming from [사람]</strong>: 특정인에게서 나온 피드백이나 말이기에 더욱 가치가 크고 고맙다는 구어체 표현입니다.",
      pattern: "• <strong>It is nice coming from [사람]</strong><br>  - 활용 예: That compliment is nice coming from my boss. (내 직장 상사로부터 들은 칭찬이라 더욱 기쁘다.)"
    }
  },
  {
    id: "sunak_03",
    speaker: "Rishi Sunak",
    en: "But oddly enough, when it comes to AI, actually for around a decade, you've almost been doing the opposite and saying, \"Hang on, we need to think about what we're doing and what we're pushing here, and what do we do to make this safe? And actually, maybe we shouldn't be pushing as fast or as hard as we are?\" Like, I mean, you've been doing it for a decade. Like, what was it that caused you to think about it that way, and you know, why do we need to be worried?",
    ko: "하지만 신기하게도 AI에 있어서는 지난 10년 동안 거의 정반대의 행보를 보이시며 이렇게 말씀해 오셨습니다. \"잠깐만요, 우리가 지금 무엇을 하고 있고 무엇을 밀어붙이고 있는지 생각해야 합니다. 이것을 안전하게 만들기 위해 무엇을 해야 할까요? 어쩌면 지금처럼 빠르게, 격렬하게 밀어붙여서는 안 되는 것 아닐까요?\"라고요. 지난 10년간 그러셨는데, 어떤 계기로 그렇게 생각하게 되셨고, 우리가 왜 걱정해야 하는 걸까요?",
    notes: {
      words: [
        { word: "oddly enough", meaning: "신기하게도, 참 묘하게도" },
        { word: "when it comes to", meaning: "~에 관한 한, ~에 대해서 말하자면" },
        { word: "opposite", meaning: "반대, 정반대의 것" },
        { word: "cause", meaning: "야기하다, ~을 유발하다" }
      ],
      structure: "• <strong>But oddly enough</strong> (하지만 이상하게도) / <strong>when it comes to AI</strong> (AI에 있어서만큼은) / <strong>actually for around a decade</strong> (사실상 지난 10년 동안) / <strong>you've almost been doing the opposite</strong> (당신은 거의 정반대의 행동을 해왔습니다) / <strong>and saying, \"Hang on...\"</strong> (그리고 잠깐만요라고 말씀하셨죠) / <strong>what was it that caused you to think...</strong> (당신이 그런 식으로 생각하게끔 유발한 장본인은 과연 무엇이었습니까?)",
      mustMemorize: "• <strong>when it comes to + 명사/동명사</strong>: 'to'가 전치사이므로 동사원형이 오면 오류입니다. 반드시 명사형이나 -ing를 써야 합니다. 실전 빈출 1순위!<br>• <strong>have been doing (현재완료 진행)</strong>: 과거 어느 시점부터 현재까지 쉬지 않고 어떤 행위를 지속해 오고 있음을 극적으로 부각합니다.",
      pattern: "• <strong>When it comes to [명사/-ing], [주어] [동사]</strong><br>  - 활용 예: When it comes to playing tennis, he is unbeatable. (테니스 치는 것에 관해서라면 그는 천하무적이다.)<br>• <strong>[원인] cause [목적어] to [동사원형]</strong><br>  - 활용 예: What caused the accident to happen? (무엇이 그 사고를 일어나게 만들었나요?)"
    }
  },
  {
    id: "musk_03",
    speaker: "Elon Musk",
    en: "Yeah, I've been somewhat of a Cassandra for quite a while. Um, where people would... I would tell people like, \"We should really be concerned about AI.\" They'd be like, \"What are you talking about?\" Like, they've never really had any experience with AI. But since I was immersed in, um, technology... I have been immersed in technology for a long time, I could see it coming.",
    ko: "네, 저는 꽤 오랫동안 일종의 '카산드라(비관적 예언가)' 같은 존재였습니다. 제가 사람들에게 \"우리는 정말로 AI에 대해 우려해야 합니다\"라고 말하면, 다들 \"무슨 소리를 하는 거냐\"는 식이었죠. 그들은 AI를 실제로 경험해 본 적이 없었으니까요. 하지만 저는 오랫동안 기술에 몰두해 있었기 때문에, 그것이 다가오는 것을 볼 수 있었습니다.",
    notes: {
      words: [
        { word: "somewhat", meaning: "다소, 다소간에" },
        { word: "Cassandra", meaning: "카산드라 (미래를 예언하지만 믿어지지 않는 사람)" },
        { word: "immersed", meaning: "몰두한, 푹 빠진" },
        { word: "concerned about", meaning: "~에 대해 염려하는" }
      ],
      structure: "• <strong>Yeah, I've been somewhat of a Cassandra</strong> (맞아요, 저는 약간 예언가 같은 존재였습니다) / <strong>for quite a while</strong> (꽤 오랫동안요) / <strong>I would tell people like...</strong> (제가 사람들에게 이렇게 말하곤 했죠) / <strong>They'd be like, \"What are you talking about?\"</strong> (그럼 그들은 '무슨 자다가 봉창 두드리는 소리냐'라고 말하곤 했죠) / <strong>But since I was immersed in technology</strong> (하지만 전 오랫동안 기술에 깊이 침잠해 있었기 때문에) / <strong>I could see it coming</strong> (그 위험이 다가오고 있는 것이 눈에 보였습니다)",
      mustMemorize: "• <strong>be immersed in</strong>: 물에 푹 잠기듯 학문, 일, 기술 등에 깊이 몰두한 황홀한 상태를 묘사하는 아주 품격 높은 숙어입니다.<br>• <strong>see it coming</strong>: 어떤 사건이나 결과(주로 나쁜 것)가 도래하기 전에 미리 알아채고 예측했다는 훌륭한 구어체 표현입니다.",
      pattern: "• <strong>be immersed in [명사]</strong><br>  - 활용 예: She was completely immersed in her book. (그녀는 책에 온전히 정신이 팔려 있었다.)<br>• <strong>could see [목적어] coming</strong><br>  - 활용 예: I could see the storm coming. (폭풍우가 다가오는 것이 훤히 보였다.)"
    }
  },
  {
    id: "musk_04",
    speaker: "Elon Musk",
    en: "Um, so... uh, but I think this year was that there've been a number of breakthroughs. I mean, you know, the point at which someone can see a dynamically created video of themselves... Um, you know, like somebody can make a video of you saying anything in real time, um, or me.",
    ko: "하지만 올해는 여러 가지 획기적인 돌파구들이 있었다고 생각합니다. 예를 들어, 누군가 역동적으로 생성된 자신의 영상을 볼 수 있는 시점이 된 것이죠. 실시간으로 당신이나 제가 하지도 않은 말을 하는 영상을 누군가 만들어낼 수 있게 된 것입니다.",
    notes: {
      words: [
        { word: "breakthrough", meaning: "혁신적 돌파구, 눈부신 진전" },
        { word: "dynamically", meaning: "역동적으로, 유동적으로" },
        { word: "real time", meaning: "실시간" }
      ],
      structure: "• <strong>but I think this year was</strong> (하지만 올해가 결정적이었다고 봅니다) / <strong>that there've been a number of breakthroughs</strong> (수많은 기술적 대진전들이 일어나서 말이죠) / <strong>the point at which someone can see</strong> (사람들이 볼 수 있게 되는 바로 그 시점) / <strong>a dynamically created video of themselves</strong> (역동적으로 합성된 자기 자신의 비디오 영상을) / <strong>saying anything in real time</strong> (실시간으로 그 어떤 말이라도 내뱉는 모습을)",
      mustMemorize: "• <strong>a number of + 복수명사</strong>: '많은 수의 ~'의 뜻으로 복수 취급합니다. 'the number of(~의 수 - 단수취급)'와 헷갈려서는 절대로 안 됩니다.<br>• <strong>the point at which</strong>: 관계대명사 구조 'at which'가 'point'를 수식하며 시간이나 상황적 계기를 훌륭하게 잡아냅니다.",
      pattern: "• <strong>a number of [복수명사]</strong><br>  - 활용 예: A number of problems have occurred. (많은 문제들이 발생했다.)<br>• <strong>make a video of [사람] -ing</strong><br>  - 활용 예: I made a video of him singing. (나는 그가 노래하는 모습의 동영상을 촬영했다.)"
    }
  },
  {
    id: "musk_05",
    speaker: "Elon Musk",
    en: "And, uh, so the sort of the deepfake videos, which are really incredibly good. In fact, sometimes more convincing than real ones, um, and deep real. And, um, and then, and then obviously things like ChatGPT were, were quite remarkable. Now, I saw GPT-1, GPT-2, GPT-3, GPT-4, that, you know, the whole sort of lead up to that. So, it was easy for me to, um, kind of see where it's going.",
    ko: "그래서 딥페이크 영상들이 정말 믿기 힘들 정도로 정교해졌습니다. 사실 가끔은 진짜보다 더 설득력 있고 진짜 같죠. 그리고 당연히 ChatGPT 같은 것들도 꽤 놀라웠습니다. 저는 GPT-1, GPT-2, GPT-3, GPT-4로 이어지는 발전 과정을 모두 지켜보았기 때문에, 이것이 어디로 향하고 있는지 알아차리기가 쉬웠습니다.",
    notes: {
      words: [
        { word: "convincing", meaning: "설득력 있는, 진짜 같아 그럴듯한" },
        { word: "obviously", meaning: "명백히, 뻔하게" },
        { word: "remarkable", meaning: "비범한, 주목할 가치가 있는" }
      ],
      structure: "• <strong>so the sort of the deepfake videos</strong> (그래서 딥페이크 영상 같은 것들은) / <strong>which are really incredibly good</strong> (진짜 믿을 수 없을 정도로 정교합니다) / <strong>In fact, sometimes more convincing than real ones</strong> (사실 때로는 진짜 비디오보다 훨씬 그럴싸합니다) / <strong>obviously things like ChatGPT were quite remarkable</strong> (ChatGPT 같은 도구들은 명백하게 대단했습니다) / <strong>So, it was easy for me to kind of see where it's going</strong> (따라서 제 입장에서는 이것이 어디로 향해 가는지 간파하기가 아주 쉬웠죠)",
      mustMemorize: "• <strong>convincing</strong>: 사람의 마음을 확실히 사로잡고 납득시킬 수 있을 정도로 완성도가 뛰어남을 일컬을 때 씁니다.<br>• <strong>it was easy for [사람] to [동사]</strong>: 가주어 'it', 의미상 주어 'for', 진주어 'to'의 가장 보편적이면서 강력한 회화 뼈대입니다.",
      pattern: "• <strong>It is easy for me to [동사원형]</strong><br>  - 활용 예: It is easy for me to read English. (나에게 영어 읽기는 식은 죽 먹기다.)<br>• <strong>see where it's going</strong><br>  - 활용 예: We need to see where this project is going. (우리는 이 프로젝트가 어떻게 굴러가는지 파악해야 한다.)"
    }
  },
  {
    id: "musk_06",
    speaker: "Elon Musk",
    en: "If you just sort of extrapolate the points on a curve and assume that trend will continue, then we will have, um, profound artificial intelligence. And obviously, at a level that far exceeds human intelligence. Um, so, um, but I'm, I'm glad to see at this point that, uh, people are taking, uh, safety seriously.",
    ko: "곡선 위의 점들을 외삽(예측)해보고 그 추세가 계속될 것이라고 가정한다면, 우리는 엄청난 인공지능을 마주하게 될 것입니다. 분명히 인간의 지능을 훨씬 능가하는 수준일 것입니다. 어쨌든 지금 시점에서 사람들이 안전 문제를 진지하게 받아들이기 시작해서 다행이라고 생각합니다.",
    notes: {
      words: [
        { word: "extrapolate", meaning: "(기존 사실로부터) 외삽하다, 추론하다" },
        { word: "profound", meaning: "심오한, 엄청난 파급력을 가진" },
        { word: "exceed", meaning: "능가하다, 초과하다" }
      ],
      structure: "• <strong>If you just sort of extrapolate the points</strong> (만약 당신이 그 데이터상의 점들을 예측해 보고) / <strong>on a curve and assume that trend will continue</strong> (성장 곡선상에서 그 추세가 유지된다고 가정한면) / <strong>then we will have profound artificial intelligence</strong> (우리는 결국 심오하고 초월적인 인공지능을 마주하게 될 겁니다) / <strong>at a level that far exceeds human intelligence</strong> (인간의 지능을 저 멀리 초월하는 수준의 지능 말이죠) / <strong>but I'm glad to see at this point</strong> (그래도 지금 현 단계에서 보게 되어 무척 기쁩니다) / <strong>that people are taking safety seriously</strong> (사람들이 안전 문제를 매우 엄중하게 다루는 모습을 보게 되어서)",
      mustMemorize: "• <strong>take [something] seriously</strong>: 장난이나 대수롭지 않은 태도가 아니라 아주 엄중하고 신중하게 비중을 두어 다룬다는 표현으로, 부사 'seriously' 자리에 형용사가 오면 절대 안 됩니다.<br>• <strong>exceed</strong>: 한도나 규정, 지능 수준 따위를 가볍게 넘어서다, 초월한다는 고급진 어휘입니다.",
      pattern: "• <strong>take [명사] seriously</strong><br>  - 활용 예: You should take my advice seriously. (너는 내 충고를 진지하게 귀담아들어야 해.)<br>• <strong>I'm glad to see [절]</strong><br>  - 활용 예: I'm glad to see you are doing well. (네가 잘 지내고 있는 모습을 보니 기쁘다.)"
    }
  },
  {
    id: "musk_07",
    speaker: "Elon Musk",
    en: "Well, I generally think that, that it is good for government to play a role when the public safety is, is at risk. So, um, you know, really for the vast majority of software, the public safety is not at risk. I mean, if, if, if the, uh, app crashes on your phone or your laptop, it's not a, a massive catastrophe.",
    ko: "음, 저는 일반적으로 공공의 안전이 위험에 처했을 때 정부가 역할을 하는 것이 좋다고 생각합니다. 사실 대다수의 소프트웨어는 공공의 안전을 위협하지 않습니다. 스마트폰이나 노트북에서 앱이 다운된다고 해서 그것이 거대한 재앙이 되지는 않으니까요.",
    notes: {
      words: [
        { word: "generally", meaning: "일반적으로, 대개" },
        { word: "at risk", meaning: "위험에 처한" },
        { word: "catastrophe", meaning: "대재앙, 큰 참사" }
      ],
      structure: "• <strong>Well, I generally think that</strong> (음, 저는 대개 그렇게 생각해요) / <strong>it is good for government to play a role</strong> (정부가 적극적으로 역할을 해 주는 것이 유익하다고) / <strong>when the public safety is at risk</strong> (공공의 안전이 심각한 위협에 처했을 때에는) / <strong>for the vast majority of software</strong> (하지만 대다수 압도적인 일반 소프트웨어의 경우) / <strong>the public safety is not at risk</strong> (공동체의 생명과 안전이 걸려 있지는 않죠)",
      mustMemorize: "• <strong>play a role</strong>: '역할을 수행하다'라는 뜻으로 연극 무대 등에서 배역을 맡아 일한다는 비유에서 파생되었습니다.<br>• <strong>at risk</strong>: 'at'이라는 접촉 전치사를 써서 위험의 직접적인 영향권 아래 노출되어 위태로운 상태를 표시합니다.",
      pattern: "• <strong>play a key role in [명사/-ing]</strong><br>  - 활용 예: Regular exercise plays a key role in staying healthy. (규칙적인 운동은 건강을 유지하는 데 핵심적인 역할을 한다.)<br>• <strong>[명사] is not at risk</strong><br>  - 활용 예: Your job is not at risk. (당신의 직무는 전혀 위험에 처해 있지 않습니다.)"
    }
  },
  {
    id: "musk_08",
    speaker: "Elon Musk",
    en: "Um, but when you're talking about digital superintelligence, I think, which does pose a risk to the public, then there is a role for government to play to safeguard the interest of the public. And, and this is of course true in many fields... um, you know, aviation, cars...",
    ko: "하지만 공공에 위험을 초래할 수 있는 '디지털 초지능'을 이야기할 때는 공공의 이익을 보호하기 위해 정부가 해야 할 역할이 있다고 봅니다. 이는 항공, 자동차 등 많은 분야에서도 당연히 적용되는 사실입니다.",
    notes: {
      words: [
        { word: "pose a risk", meaning: "위험을 야기하다, 위험 요소가 되다" },
        { word: "safeguard", meaning: "보호하다, 수호하다" },
        { word: "aviation", meaning: "항공학, 비행기술" }
      ],
      structure: "• <strong>but when you're talking about digital superintelligence</strong> (하지만 당신이 초지능 컴퓨터를 논하게 된다면) / <strong>which does pose a risk to the public</strong> (그것은 공공에 엄청난 위협을 실제로 가져올 수 있으므로) / <strong>there is a role for government to play</strong> (반드시 정부가 관여해야 할 역할이 존재합니다) / <strong>to safeguard the interest of the public</strong> (대중들의 권익을 보호하기 위해서 말이죠)",
      mustMemorize: "• <strong>does pose (강조의 do)</strong>: 일반동사 'pose' 앞에 조동사 'does'를 추가하여 '진짜로 위협을 가한다!'라며 동사의 에너지를 강하게 고취시킵니다.<br>• <strong>safeguard the interest of</strong>: 단순 'protect'보다 한 층 더 격조 높고 공식적인 어휘로 '이권과 권익을 공고히 지키다'라는 엄숙한 의미입니다.",
      pattern: "• <strong>pose a threat/risk to [대상]</strong><br>  - 활용 예: Heavy smoking poses a serious risk to your health. (지나친 흡연은 당신의 건강에 심각한 위험을 가한다.)<br>• <strong>safeguard the interest of [집단]</strong><br>  - 활용 예: We must safeguard the interest of consumers. (우리는 소비자들의 권익을 반드시 보호해야 한다.)"
    }
  },
  {
    id: "musk_09",
    speaker: "Elon Musk",
    en: "But, but, but I think there's... we've learned over the years that, uh, having a referee is a good thing. And if you look at any sports game, there's always a, a referee. And, and nobody's suggesting, I think, to have a sports game without one. Um, and, and I think that's the, the right way to think about this is for, um, for government to be a referee to make sure there's sportsmanlike conduct and, and, and that the public safety is, um, you know, is, is addressed...",
    ko: "하지만 우리는 지난 세월 동안 '심판'이 있는 것이 좋은 일이라는 걸 배웠습니다. 어떤 스포츠 경기를 보더라도 항상 심판이 있습니다. 심판 없이 스포츠 경기를 하자고 제안하는 사람은 아무도 없을 겁니다. 정부가 심판 역할을 하여 정당한 행위가 이루어지고 있는지 확인하고, 공공의 안전이 잘 다루어지고 있는지 보장하는 것이 올바른 접근 방식이라고 생각합니다.",
    notes: {
      words: [
        { word: "referee", meaning: "심판, 중재인" },
        { word: "sportsmanlike", meaning: "정당한 스포츠맨십을 보여주는" },
        { word: "address", meaning: "(어려운 문제를) 다루다, 해결책을 고심하다" }
      ],
      structure: "• <strong>we've learned over the years that</strong> (우리는 긴 세월 동안 뼈저리게 배웠습니다) / <strong>having a referee is a good thing</strong> (게임에 심판이 있다는 것은 아주 좋은 현상임을) / <strong>nobody's suggesting to have a sports game without one</strong> (아무도 심판 없는 스포츠 시합을 치르자고 우기지 않습니다) / <strong>for government to be a referee</strong> (정부가 든든한 경기 심판 역할을 수행해 줌으로써) / <strong>to make sure there's sportsmanlike conduct</strong> (룰에 어긋나지 않는 신사적 행위가 보장되는지 감시하고) / <strong>and that the public safety is addressed</strong> (공동체의 안전이 면밀히 검토되도록 만드는 것이 중요합니다)",
      mustMemorize: "• <strong>address</strong>: 주소라는 뜻 외에 동사로 쓰이면 '골치 아픈 난제를 붙잡고 적극적으로 해결하기 위해 고심하고 다루다'라는 대단히 격식 있고 수준 높은 비즈니스 필수 동사입니다.<br>• <strong>make sure</strong>: '틀림없이 ~하도록 확실하게 매듭을 짓다'라는 뜻입니다.",
      pattern: "• <strong>We need to address the issue of [명사]</strong><br>  - 활용 예: We need to address the issue of climate change. (우리는 기후 변화라는 당면 과제를 시급히 다루어야 한다.)"
    }
  },
  {
    id: "musk_10",
    speaker: "Elon Musk",
    en: "And I actually agree with the vast majority of regulations. There's a few that I disagree with from time to time, but 1% probably of... less than 1% of regulations I disagree with.",
    ko: "그리고 저는 사실 대다수의 규제에 동의합니다. 때때로 동의하지 않는 규제가 몇 개 있긴 하지만, 제가 반대하는 규제는 아마 1% 미만일 것입니다.",
    notes: {
      words: [
        { word: "agree with", meaning: "~의 의견에 동의하다, 찬성하다" },
        { word: "disagree with", meaning: "~의 의견에 이의를 제기하다" },
        { word: "from time to time", meaning: "때때로, 간간이" }
      ],
      structure: "• <strong>And I actually agree with</strong> (그리고 저는 사실 전적으로 동의합니다) / <strong>the vast majority of regulations</strong> (대다수 압도적인 국가 규제 방안에 대해서) / <strong>There's a few that I disagree with from time to time</strong> (물론 저도 가끔 속으로 불만을 품는 몇 가지 규제가 존재하긴 하지만) / <strong>but less than 1% of regulations I disagree with</strong> (제가 실질적으로 발끈하며 반대하는 규제는 1%도 채 되지 않죠)",
      mustMemorize: "• <strong>agree with vs. agree to</strong>: 'with'는 생각이나 의견, 타인의 의견에 광범위하게 동의할 때 사용하며, 'to'는 제안, 합의안, 계획안 등에 격식 있게 승인/찬동할 때 활용합니다.<br>• <strong>less than</strong>: '~보다 적은, ~미만의' 숫자를 동반할 때 유용한 한계점 지점 표현입니다.",
      pattern: "• <strong>I agree with the vast majority of [복수명사]</strong><br>  - 활용 예: I agree with the vast majority of the members. (나는 회원들의 압도적 다수의 생각에 찬성한다.)"
    }
  },
  {
    id: "musk_11",
    speaker: "Elon Musk",
    en: "So, um, and there is some concern from, uh, people in Silicon Valley who, who've never dealt with regulators before, and they think that this is going to just crush innovation and slow them down and be annoying. And, and, and, uh, it will be annoying, it's true. Um, they're not wrong about that.",
    ko: "그래서 규제 당국을 상대해 본 적이 없는 실리콘밸리 사람들 사이에서는 우려의 목소리가 있습니다. 그들은 규제가 혁신을 짓밟고 자신들을 느리게 만들며 귀찮게 할 뿐이라고 생각하죠. 그리고 실제로 귀찮아질 것이라는 점은 사실입니다. 그들의 말이 틀린 것은 아닙니다.",
    notes: {
      words: [
        { word: "deal with", meaning: "대처하다, 거래하다, 상대하다" },
        { word: "crush", meaning: "짓밟다, 뭉개버리다" },
        { word: "slow down", meaning: "속도를 늦추게 하다" }
      ],
      structure: "• <strong>and there is some concern from people in Silicon Valley</strong> (그래서 실리콘밸리의 기술 엔지니어들 사이에선 일부 걱정이 있습니다) / <strong>who've never dealt with regulators before</strong> (한 번도 까다로운 정부 규제관들을 골치 아프게 상대해 본 역사가 없는 이들인데) / <strong>and they think that this is going to just crush innovation</strong> (그들은 이런 통제들이 자유로운 창의적 혁신을 짓밟을까 봐 불안해하죠) / <strong>and slow them down and be annoying</strong> (연구 개발의 속도를 떨어뜨리고 귀찮게 굴면서 말이에요) / <strong>And it will be annoying, it's true</strong> (그런데 솔직히 귀찮아지는 것은 엄연한 팩트입니다)",
      mustMemorize: "• <strong>deal with</strong>: 비즈니스 대화에서 거래처를 대하거나, 문제 상황을 헤쳐 나가거나, 사람을 매끄럽게 응대할 때 사용하는 만능 만능 숙어입니다.<br>• <strong>crush</strong>: 단순한 방해가 아니라 물리적, 심리적으로 숨도 못 쉬게 강력히 억눌러 버리는 강력한 파괴적 뉘앙스를 담은 표현입니다.",
      pattern: "• <strong>I have never dealt with [대상] before</strong><br>  - 활용 예: I have never dealt with such a difficult client before. (나는 이런 골치 아픈 고객을 전에 상대해 본 적이 없다.)"
    }
  },
  {
    id: "musk_12",
    speaker: "Elon Musk",
    en: "...because I think there might be at times too much optimism about technology. And I speak... I say that as a technologist, I mean, so I ought to know. Um, and, and, uh, and, and like I said, on, on balance, I think that, that the AI will be a force for good, most likely, but the probability of it going bad is not 0%.",
    ko: "왜냐하면 가끔 기술에 대해 지나친 낙관주의가 존재할 수 있기 때문입니다. 저 역시 기술자로서 드리는 말씀이니 누구보다 잘 알고 있죠. 앞서 말씀드렸듯이 전반적으로 AI는 유익한 힘이 될 가능성이 가장 높지만, 잘못될 확률이 0%는 아닙니다.",
    notes: {
      words: [
        { word: "optimism", meaning: "낙관주의, 긍정주의" },
        { word: "on balance", meaning: "모든 요소를 종합 고려할 때, 전체적으로 볼 때" },
        { word: "probability", meaning: "확률, 가능성" }
      ],
      structure: "• <strong>there might be at times too much optimism</strong> (때때로 너무 심각할 정도의 막연한 낙관론이 존재할지 모릅니다) / <strong>about technology</strong> (우리 기술 문명에 대해서) / <strong>I say that as a technologist</strong> (기술 전문가라는 저의 신분을 걸고 고백하는 말입니다) / <strong>so I ought to know</strong> (그러니 제가 사정을 누구보다 속속들이 꿰뚫어 알고 있어야 정상이죠) / <strong>the AI will be a force for good, most likely</strong> (대단히 높은 확률로 인공지능은 우리에게 축복의 선한 힘이 될 것입니다) / <strong>but the probability of it going bad is not 0%</strong> (그러나 그것이 완전 나쁘게 엇나가 버릴 파국적 시나리오의 확률 역시 0%는 아니죠)",
      mustMemorize: "• <strong>ought to + 동사원형</strong>: 'should'보다 다소 도덕적 의무감이나 객관적 당연성이 단단하게 서려 있는 엄숙한 의무의 조동사입니다.<br>• <strong>force for good</strong>: 사회를 이롭게 바꾸고 인간의 존엄을 드높이는 강력한 도덕적 원동력이나 선의의 매개체를 시적으로 표현할 때 즐겨 씁니다.",
      pattern: "• <strong>I say that as a [자격/신분]</strong><br>  - 활용 예: I say that as a father of three children. (세 아이를 키우는 아버지의 이름을 걸고 말씀드리는 겁니다.)"
    }
  },
  {
    id: "musk_13",
    speaker: "Elon Musk",
    en: "Yeah. So we, we just need to mitigate the downside potential.",
    ko: "맞습니다. 그래서 우리는 부정적인 결과가 초래할 잠재적 위험을 완화해야 합니다.",
    notes: {
      words: [
        { word: "mitigate", meaning: "(고통, 슬픔, 위험 등을) 완화하다, 달래다" },
        { word: "downside", meaning: "하락 국면, 단점, 부정적인 측면" },
        { word: "potential", meaning: "잠재력, 가능성" }
      ],
      structure: "• <strong>Yeah. So we just need to</strong> (맞습니다. 그러므로 우리는 단지 ~할 수밖에 없습니다) / <strong>mitigate the downside potential</strong> (최악의 시나리오가 가져올 잠재적 재난 가능성을 미리 줄여놓는 일 말이죠)",
      mustMemorize: "• <strong>mitigate</strong>: 리스크 매니지먼트, 금융, 정책 공학에서 핵심적으로 쓰이는 고급 단어입니다. 위험이나 분노를 부드럽게 쓰다듬어 수그러지게 만든다는 정밀한 동작입니다.<br>• <strong>downside potential</strong>: 비즈니스 및 통계적 예측 분야에서 '상황이 최악으로 치달았을 때 감내해야 할 누적 피해 한계액/범위'를 지칭하는 전문적인 용어입니다.",
      pattern: "• <strong>mitigate the risk of [명사]</strong><br>  - 활용 예: We must take actions to mitigate the risk of fires. (화재 위험을 미리 예방하고 경감하기 위한 강력한 액션을 개시해야 한다.)"
    }
  },
  {
    id: "sunak_04",
    speaker: "Rishi Sunak",
    en: "Thank you for the opportunity. Elon, question for you, um, uh, related to X platform. Are there simple things we can do, especially when it comes to visual media? You alluded to the fact that it's fairly straightforward and effectively free to make people like yourselves say and do things that you never said or did.",
    ko: "기회를 주셔서 감사합니다. 일론, X 플랫폼과 관련해서 질문이 있습니다. 특히 시각 매체(영상/이미지)와 관련해서 우리가 할 수 있는 간단한 방법이 있을까요? 당신 같은 사람들이 하지도 않은 말과 행동을 하도록 만드는 것이 꽤 간단하고 사실상 비용도 들지 않는다고 언급하셨는데요.",
    notes: {
      words: [
        { word: "allude to", meaning: "~을 암시하다, 넌지시 빗대어 비치다" },
        { word: "straightforward", meaning: "속이지 않고 정직한, 진행 과정이 단순 명료한" },
        { word: "effectively", meaning: "실질적으로, 효과적으로" }
      ],
      structure: "• <strong>Thank you for the opportunity</strong> (이런 귀중한 대화 기회를 주셔서 진심으로 고마워요) / <strong>Are there simple things we can do</strong> (우리가 발 벗고 실천할 만한 지극히 간단한 방안이 존재할까요?) / <strong>You alluded to the fact that</strong> (당신은 ~라는 냉혹한 사실에 대해 방금 넌지시 귀띔하셨는데) / <strong>it's fairly straightforward and effectively free</strong> (비교적 너무나 식은 죽 먹기이고 비용 또한 거의 공짜에 가깝다는 것) / <strong>to make people like yourselves say and do things</strong> (당신들 같은 유명 인사를 내세워 가짜 말을 내뱉고 엉뚱한 짓을 저지르게 조작하는 것이)",
      mustMemorize: "• <strong>allude to + 명사</strong>: 대놓고 윽박지르거나 직설적으로 지명하지 않고, 살짝 돌려 표현하여 지능적이고 완곡하게 지칭할 때 쓰는 명품 단어입니다.<br>• <strong>straightforward</strong>: 비비 꼬이거나 미로 같은 단계가 없어 초보자도 매뉴얼만 보면 즉시 처리할 정도로 명백하고 거침없는 절차를 뜻합니다.",
      pattern: "• <strong>allude to the fact that [절]</strong><br>  - 활용 예: He alluded to the fact that he might resign soon. (그는 자신이 조만간 사임할지도 모른다는 낌새를 넌지시 비쳤다.)"
    }
  },
  {
    id: "sunak_05",
    speaker: "Rishi Sunak",
    en: "Yeah. Um, can we do something like cryptographically signed media? I'm from Adobe, we're working on this project. Yeah, Twitter was a member, love to see X come back. Okay. Um, digitally signed media to indicate, uh, not only what was created by AI, but what came from a camera, what was real. Yeah. To imbue a sense of trust in media that can go viral.",
    ko: "네. 그렇다면 암호학적으로 서명된 미디어 같은 것을 도입할 수 있을까요? 저는 어도비(Adobe)에서 왔고 현재 이 프로젝트를 진행 중입니다. 예전에 트위터도 회원이었는데 X도 다시 참여하면 좋겠습니다. AI로 생성된 것뿐만 아니라 카메라로 찍은 진짜가 무엇인지 표시하기 위해 디지털 서명이 된 미디어를 도입하는 거죠. 그래서 바이럴되는 미디어에 신뢰감을 불어넣는 것입니다.",
    notes: {
      words: [
        { word: "cryptographically", meaning: "암호학적인 기법을 써서" },
        { word: "indicate", meaning: "손가락으로 콕 짚어 가리키다, 표명하다" },
        { word: "imbue", meaning: "(사상, 색상, 감정을) 가득 스며들게 채워 넣다" }
      ],
      structure: "• <strong>can we do something like cryptographically signed media</strong> (우리가 암호학적 서명이 결합된 매체 같은 걸 도입해 보면 어떨까요?) / <strong>digitally signed media to indicate</strong> (디지털 진위 확인 서명을 박은 미디어를 통해 명시하는 겁니다) / <strong>not only what was created by AI</strong> (인공지능 비서가 뚝딱 창조해 낸 가짜 비디오뿐만 아니라) / <strong>but what came from a camera, what was real</strong> (진짜 아날로그 카메라 렌즈를 통과해 캡처된 가감 없는 순수한 현실의 영상까지) / <strong>To imbue a sense of trust in media</strong> (뉴스 미디어에 대해 확고한 도덕적 신뢰감을 가득 불어넣어 주기 위해)",
      mustMemorize: "• <strong>imbue A with B / imbue B in A</strong>: 스펀지가 붉은 잉크를 듬뿍 빨아들여 온통 물들듯, 신뢰나 애국심, 숭고한 정신 가치를 사람의 마음속 깊은 곳까지 진하게 흡수시키는 감동적인 표현입니다.<br>• <strong>not only A but (also) B</strong>: A뿐만 아니라 B 역시 마찬가지라는 구문으로, 회화에서는 격식을 깨고 'also'를 과감하게 생략하는 경향이 짙습니다.",
      pattern: "• <strong>imbue [목적어] with a sense of [감정]</strong><br>  - 활용 예: The teacher tried to imbue her students with a sense of confidence. (교사는 제자들의 가슴에 깊은 자신감을 가득 심어주려고 눈물겹게 노력했다.)"
    }
  },
  {
    id: "musk_14",
    speaker: "Elon Musk",
    en: "That sounds like a good idea actually. So if, um, some, some way of authenticating would be, would be good. Um, so, yeah, I... that sounds like a good idea. We should, we should probably do it.",
    ko: "사실 그것 참 좋은 아이디어 같네요. 어떤 방식으로든 인증할 수 있는 수단이 있다면 좋을 것입니다. 네, 좋은 생각인 것 같습니다. 저희도 도입을 고려해 봐야겠네요.",
    notes: {
      words: [
        { word: "authenticate", meaning: "진짜임을 입증하다, 공인하다" },
        { word: "actually", meaning: "사실은, 의외로" },
        { word: "probably", meaning: "아마, 십중팔구" }
      ],
      structure: "• <strong>That sounds like a good idea actually</strong> (어, 들어보니 그거 진짜 의외로 엄청 매력적인 아이디어네요) / <strong>if some way of authenticating would be good</strong> (진본 여부를 공적으로 식별하고 인증할 장치가 결합된다면 대단히 훌륭하겠습니다)",
      mustMemorize: "• <strong>sound like + 명사</strong>: 귀로 소리를 들어본 뒤 판단한 감각적 결론을 조심스럽게 꺼낼 때 씁니다. 'sound' 뒤에 형용사가 단독으로 올 때는 전치사 'like'가 탈락합니다. (예: That sounds great.)<br>• <strong>authenticate</strong>: 미술 진품 판정이나, 전산 시스템 보안 로그인 시 지문과 비밀번호 등으로 정당한 소유자인지를 신원 보증하는 행위입니다.",
      pattern: "• <strong>That sounds like a [형용사] [명사]</strong><br>  - 활용 예: That sounds like a wonderful plan. (정말 멋들어진 계획처럼 들리는구나.)"
    }
  },
  {
    id: "sunak_06",
    speaker: "Rishi Sunak",
    en: "Yeah, there you go. And you know, and actually on that, on that point, so I've, I've already... so this is particularly pertinent for people in my job, right? And I've already had a situation happen to me with a doctored image that goes everywhere negative. By the time everyone realizes, \"Well, that's fake and we should stop sending it,\" the damage is, the damage is done.",
    ko: "좋습니다. 실제로 그 점에 대해서는 저처럼 정치를 하는 사람들에게 특히나 밀접한 문제인데요. 저 역시 저를 비방하는 조작된 이미지가 사방으로 퍼지는 상황을 이미 겪은 적이 있습니다. 사람들이 \"이거 가짜니까 그만 공유하자\"고 깨달을 때쯤에는 이미 피해가 발생한 뒤였습니다.",
    notes: {
      words: [
        { word: "pertinent", meaning: "직접적인 이해관계가 얽혀 있는, 정곡을 찌르는" },
        { word: "doctored", meaning: "악의적으로 변조된, 위조된" },
        { word: "damage", meaning: "피해, 물리적 정신적 타격" }
      ],
      structure: "• <strong>this is particularly pertinent</strong> (이 주제는 정말 엄청나게 깊은 이해관계가 맞물려 있습니다) / <strong>for people in my job, right?</strong> (정치인처럼 이미지로 먹고사는 직군에 속한 이들에게 말이죠) / <strong>And I've already had a situation happen to me</strong> (그리고 저 또한 억울한 수모 상황을 직접 온몸으로 겪었습니다) / <strong>with a doctored image that goes everywhere negative</strong> (나에 대한 부정적 인식을 선동하기 위해 조작된 가짜 합성 사진이 온 세상으로 삽시간에 유포되는 사건을) / <strong>By the time everyone realizes...</strong> (대중들이 비로소 그것이 조작된 가짜 삐라임을 겨우 알아채고 퍼 나르기를 멈출 시점에는) / <strong>the damage is done</strong> (슬프게도 저의 평판에 이미 만회할 수 없는 타격이 가해진 후였죠)",
      mustMemorize: "• <strong>pertinent to</strong>: 어떤 당면 안건이나 학술 토론에 대해 겉돌지 않고 본질을 꿰뚫어 확실하게 연관이 되어 있음을 의미하는 지적인 어휘입니다.<br>• <strong>the damage is done</strong>: '이미 주사위는 던져졌고 피해는 겉잡을 수 없이 일어났다'라는 슬프고 체념 섞인 원어민들의 빈출 숙어입니다.",
      pattern: "• <strong>[안건] is pertinent to [대상]</strong><br>  - 활용 예: The laws are pertinent to all citizens. (그 법률 조항은 모든 일반 시민들에게 긴밀하고 유효하게 귀속된다.)<br>• <strong>By the time [주어] [동사], [주어] [과거동사]</strong><br>  - 활용 예: By the time we arrived, the train had left. (우리가 승강장에 겨우 당도했을 때 이미 열차는 자취를 감추고 떠난 상태였다.)"
    }
  },
  {
    id: "sunak_07",
    speaker: "Rishi Sunak",
    en: "Um, and actually we were again reflecting today, if you think next year you've got elections in, you know, I think, you know, the US, India, I think Indonesia, um, probably here. There you go. Uh, massive news. Um, and actually you've got just an enormous chunk of the world's population is voting next year, right? And you got EU elections as well.",
    ko: "그리고 오늘 다시 한번 되짚어 보았는데, 내년(2024년)에는 미국, 인도, 인도네시아, 그리고 아마 여기(영국)까지 선거가 치러집니다. 엄청난 뉴스죠. 실제로 내년에는 전 세계 인구의 엄청난 비중이 투표를 하게 됩니다. EU 선거도 있고요.",
    notes: {
      words: [
        { word: "reflect on", meaning: "조용히 명상하다, 과거를 차분히 회고하다" },
        { word: "election", meaning: "민주주의 투표 선거" },
        { word: "chunk", meaning: "빵이나 치즈의 두꺼운 덩어리, 상당량" }
      ],
      structure: "• <strong>actually we were again reflecting today</strong> (실은 저희 참모진이 오늘 이 문제를 조용히 곱씹으며 성찰해 보았는데) / <strong>if you think next year you've got elections</strong> (가만히 헤아려보면 내년에 굵직한 선거들이 줄줄이 예정되어 있어요) / <strong>in the US, India, I think Indonesia, probably here</strong> (미국, 세계 최대 인구 대국 인도, 인도네시아, 그리고 아마 우리 영국 땅에서도요) / <strong>an enormous chunk of the world's population is voting</strong> (지구촌 전체 인류의 실로 엄청난 규모의 덩어리가 소중한 표를 던지게 되는 겁니다)",
      mustMemorize: "• <strong>reflect on</strong>: 단어의 원뜻인 '빛을 반사하다'에서 파생하여, 자신의 행동이나 과거의 중대한 이슈를 거울에 비춰보듯 거리를 두고 차분하게 심사숙고함을 뜻하는 멋진 지성적 동사구입니다.<br>• <strong>a huge chunk of</strong>: 수치나 통계 자료를 시각화할 때 피자 한 조각의 절반만큼이나 큼직한 비율 영역을 친근하게 일컬을 때 자주 쓰는 감각적 구어입니다.",
      pattern: "• <strong>reflect on [경험/과거]</strong><br>  - 활용 예: I need some quiet time to reflect on my career. (나는 내 커리어의 족적을 차분히 성찰해 볼 조용한 시간이 절실하다.)"
    }
  },
  {
    id: "sunak_08",
    speaker: "Rishi Sunak",
    en: "And you know, actually just these issues are right in front of us. You know, next year is where big elections across the globe... probably the first set of elections where this (AI) has been a real issue. Yeah. Um, so figuring out how we manage that is, I think, kind of mission-critical for people who want, you know, the integrity of our democracy.",
    ko: "이 문제들이 바로 우리 눈앞에 닥쳐와 있습니다. 내년에 치러질 글로벌 대선들은 AI가 실제적인 위협이자 문제로 떠오르는 첫 번째 선거가 될 것입니다. 따라서 이를 어떻게 관리할지 찾아내는 것은 민주주의의 무결성을 지키고자 하는 사람들에게 매우 중대한 임무입니다.",
    notes: {
      words: [
        { word: "right in front of", meaning: "바로 ~의 코앞에 맞닥뜨린" },
        { word: "integrity", meaning: "어떤 흠집도 없이 온전하고 고결한 무결성, 청렴함" },
        { word: "democracy", meaning: "민주주의 제도" }
      ],
      structure: "• <strong>actually just these issues are right in front of us</strong> (실제로 이런 기술적 재난 이슈가 바로 우리 코앞에 정면으로 들이닥쳐 있습니다) / <strong>probably the first set of elections</strong> (아마 역사상 최초의 본격적인 선거 국면이 될 테지요) / <strong>where this has been a real issue</strong> (인공지능의 여론 조작이 엄연한 실존적 위협으로 떠오른) / <strong>so figuring out how we manage that</strong> (따라서 우리가 이 혼란을 어떻게 제어하고 수습할지 해답을 찾아내는 것은) / <strong>is kind of mission-critical for people</strong> (국가의 운명을 쥔 핵심 인물들에게 그야말로 사활이 걸린 중대사입니다) / <strong>who want the integrity of our democracy</strong> (우리 자유민주주의의 신성한 무결성과 숭고함을 수호하고자 하는)",
      mustMemorize: "• <strong>figuring out</strong>: 계산하거나 머리를 쥐어짜 연구한 끝에 안 풀리던 문제의 수학적 해법이나 비밀 통로를 마침내 밝혀내는 통쾌한 깨달음의 동작입니다.<br>• <strong>integrity</strong>: 인격적인 고결함, 혹은 정보 보안이나 헌법 시스템이 전혀 오염되거나 해킹당하지 않고 원형 그대로의 신뢰를 유지하고 있는 고결한 상태를 묘사하는 최고급 개념어입니다.",
      pattern: "• <strong>figure out how to [동사원형]</strong><br>  - 활용 예: I can't figure out how to operate this machine. (나는 이 기계를 어떻게 돌려야 하는지 도무지 머리를 굴려봐도 해결책을 모르겠다.)"
    }
  },
  {
    id: "sunak_09",
    speaker: "Rishi Sunak",
    en: "Yeah. I mean, some of it is, is quite entertaining, like the, the Pope in the puffer jacket. Have you seen that one?",
    ko: "맞습니다. 물론 '패딩을 입은 교황' 사진처럼 꽤 재미있는 것도 있긴 합니다. 그 사진 보셨나요?",
    notes: {
      words: [
        { word: "entertaining", meaning: "대단히 재미있고 오락성이 충만한" },
        { word: "puffer jacket", meaning: "오리털 패딩 점퍼" }
      ],
      structure: "• <strong>some of it is quite entertaining</strong> (물론 그 가짜 합성 미디어의 일부는 꽤 유쾌하고 흥미로운 구석도 있습니다) / <strong>like the Pope in the puffer jacket</strong> (두터운 롱패딩 점퍼를 입고 힙하게 서 계신 교황님 가짜 사진처럼 말이죠)",
      mustMemorize: "• <strong>entertaining</strong>: 단순히 'funny(웃긴)' 수준을 넘어, 지적 흥미나 대중적 예술 감성을 자극하여 기분 좋은 감상 경험을 선사할 때 쓰는 세련된 형용사입니다.",
      pattern: "• <strong>Some of [복수명사] are [형용사]</strong><br>  - 활용 예: Some of his stories are quite entertaining. (그가 들려주는 일화들 중 몇 개는 제법 배꼽 잡고 빠져들게 할 만큼 쏠쏠하게 재밌다.)"
    }
  },
  {
    id: "sunak_10",
    speaker: "Rishi Sunak",
    en: "I haven't.",
    ko: "저는 못 봤습니다.",
    notes: {
      words: [
        { word: "haven't", meaning: "본 적이 없다 (seen it의 줄임)" }
      ],
      structure: "• <strong>I haven't</strong> (저는 아직 못 봤네요)",
      mustMemorize: "• <strong>I haven't.</strong>: 'Have you seen ~?'의 질문에 대답하는 교과서적인 완료시제 축약 대답입니다. 불필요한 중복 단어(seen it)를 과감하게 날려 대화의 템포를 경쾌하게 끌고 갑니다."
    }
  },
  {
    id: "musk_15",
    speaker: "Elon Musk",
    en: "Well, what are the odds he's wearing a puffer jacket in July in Rome? Uh, you know, he'd be sweating. But it actually looked quite, quite dashing, I have to say. Um, in fact, I think AI fashioners are going to be a real thing.",
    ko: "로마의 7월에 교황이 패딩을 입고 있을 확률이 얼마나 되겠습니까, 땀 범벅이 될 겁니다. 하지만 솔직히 꽤 멋져 보이긴 했습니다. 사실 저는 'AI 패션 디자이너'라는 직업이 실제로 존재하게 될 것 같습니다.",
    notes: {
      words: [
        { word: "what are the odds", meaning: "과연 그럴 확률이 얼마나 되겠어? (불가능하다)" },
        { word: "dashing", meaning: "늠름하고 스타일이 아주 힙하여 시선을 확 사로잡는" },
        { word: "in fact", meaning: "더욱이, 사실인즉슨" }
      ],
      structure: "• <strong>Well, what are the odds</strong> (자, 과연 확률이 얼마나 되겠습니까?) / <strong>he's wearing a puffer jacket in July in Rome?</strong> (교황님이 햇볕이 쨍쨍 내리쬐는 한여름 7월의 이탈리아 로마 길거리에서 거위털 롱패딩을 휘감고 계실 확률이?) / <strong>Uh, you know, he'd be sweating</strong> (당연히 땀을 삐질삐질 흘리며 기절초풍하셨겠죠) / <strong>But it actually looked quite dashing, I have to say</strong> (그렇지만 겉보기엔 정말 무진장 힙하고 멋지게 잘 뽑혔다고 인정할 수밖에 없네요) / <strong>I think AI fashioners are going to be a real thing</strong> (머지않아 인공지능이 직업 세계에서 전문 패션 스타일리스트로 활약하는 시대가 본격 개막될 겁니다)",
      mustMemorize: "• <strong>what are the odds + 평서문</strong>: '설마 그럴 리가 있겠어?'라는 회의적이고 유머러스한 비유적 반문 형태입니다. 회화의 탄력을 높여주는 단골 치트키 구문입니다.<br>• <strong>dashing</strong>: 겉모습이 대단히 깔끔하고, 카리스마가 흘러넘치며, 옷차림새 또한 유행의 세련됨을 극도로 뿜어내는 호감 가득한 외모 묘사 단어입니다.",
      pattern: "• <strong>What are the odds that [평서문]</strong><br>  - 활용 예: What are the odds that we will win the lottery? (우리가 로또에 당첨될 확률이 도대체 얼마나 되겠냐?)"
    }
  },
  {
    id: "musk_16",
    speaker: "Elon Musk",
    en: "So, so out of doom and gloom, like we live in the most interesting times, and I think this is, um... it is, you know, like 80% likely to be good and 20% bad. And I think we're, if we're cognizant and, and careful about the bad part, on balance, actually, it will be the future that we want, um, or the, the future that is preferable.",
    ko: "그러니까 암울한 이야기에서 벗어나서 보면, 우리는 가장 흥미로운 시대를 살고 있습니다. 저는 이것이 좋은 결과가 될 확률이 80%, 나쁜 결과가 될 확률이 20% 정도라고 봅니다. 우리가 나쁜 부분에 대해 인지하고 주의를 기울인다면, 전반적으로 결국 우리가 원하는 미래, 혹은 더 바람직한 미래가 될 것입니다.",
    notes: {
      words: [
        { word: "doom and gloom", meaning: "파멸과 우울, 비관적인 먹구름 전망" },
        { word: "cognizant", meaning: "~에 대해 똑똑히 자각하고 의식적인 방비 태세를 갖춘" },
        { word: "preferable", meaning: "양자 중에서 훨씬 선택하기 좋고 더 마음에 드는" }
      ],
      structure: "• <strong>So, so out of doom and gloom</strong> (자, 그러니까 종말론적인 비관론에서 한걸음 빠져나와 보자면) / <strong>we live in the most interesting times</strong> (우리는 인류 역사상 그 어느 때보다 역동적이고 재미난 황금시대를 살아가고 있습니다) / <strong>this is 80% likely to be good and 20% bad</strong> (인공지능의 운명은 약 80%의 확률로 기적의 선물이 되고 20%의 파멸 확률이 걸려 있다고 봅니다) / <strong>if we're cognizant and careful about the bad part</strong> (만약 우리가 저 20%의 파멸 요소를 명확히 깨닫고 철저히 주의를 기울여 통제한다면) / <strong>on balance, it will be the future that we want</strong> (종합해 볼 때, 결국 우리가 가슴으로 간절히 바라던 찬란한 미래가 실현될 겁니다)",
      mustMemorize: "• <strong>doom and gloom</strong>: 거리가 온통 미세먼지와 불황의 잿빛 어둠으로 뒤덮인 듯한 최악의 부정적인 집단 비관 심리 상태를 대구 어조로 찰지게 말하는 환상적인 수어입니다.<br>• <strong>be cognizant of/that</strong>: 단순 'know'를 넘어, 어떤 잠재적 리스크나 주변의 은밀한 상황 변화를 레이더망처럼 날카롭게 눈치채고 머리로 철저히 정밀 모니터링 중인 지성인의 태도를 말합니다.",
      pattern: "• <strong>[주어] be likely to be [형용사/명사]</strong><br>  - 활용 예: It is highly likely to rain tonight. (오늘 밤 비가 쏟아질 확률이 굉장히 다분하다.)<br>• <strong>be cognizant of the fact that [절]</strong><br>  - 활용 예: We must be cognizant of the fact that resources are limited. (우리는 자원이 유한하다는 뼈저린 현실적 한계를 반드시 똑바로 지각하고 있어야 한다.)"
    }
  },
  {
    id: "musk_17",
    speaker: "Elon Musk",
    en: "And, and it actually will be some, somewhat of a leveler, an equalizer in the sense that, you know, I think everyone will have access to goods and services and education. And so, you know, I, I think probably it leads to more human happiness. So, I, I guess I'd probably leave on, on an optimistic note.",
    ko: "그리고 이는 모든 사람이 재화, 서비스, 교육에 접근할 수 있게 된다는 점에서 어느 정도 평등을 가져다주는 '이퀄라이저(평등장치)'가 될 것입니다. 그래서 아마도 더 많은 인류의 행복으로 이어질 것이라 생각합니다. 그러니 낙관적인 어조로 마무리를 짓고 싶네요.",
    notes: {
      words: [
        { word: "leveler", meaning: "빈부격차를 없애고 평평하게 깎아주는 평등 분배 장치" },
        { word: "equalizer", meaning: "평등하게 밸런스를 맞춰주는 균형기" },
        { word: "access to", meaning: "~에 대한 자유로운 진입 장벽 없는 접근권" }
      ],
      structure: "• <strong>And it actually will be somewhat of a leveler, an equalizer</strong> (그리고 인공지능 기술은 사실 빈부의 차이를 메워 평등하게 만들어 주는 이퀄라이저 기계가 될 것입니다) / <strong>in the sense that everyone will have access</strong> (그 어떤 빽이나 돈이 없는 천덕꾸러기일지라도 똑같이 자유로운 권리를 누릴 수 있다는 점에서) / <strong>to goods and services and education</strong> (값싸고 질 높은 최고급 생활 서비스와 하버드대 수준의 과외 교육에 대해) / <strong>So I guess I'd probably leave on an optimistic note</strong> (그러므로 저는 이번 AI 대담을 희망차고 낙관적인 엔딩 멘트로 맺는 편이 맞다고 봅니다)",
      mustMemorize: "• <strong>in the sense that [평서문]</strong>: '앞에 말한 논제는 이러이러한 시각/측면/의미에서 진정으로 참이다'라며 자신의 핵심 논거의 방향을 영리하게 좁혀 제안하는 논설문 단골 논리 연결사입니다.<br>• <strong>access to [명사]</strong>: 'to'가 전치사이므로 반드시 도달하고자 하는 최종 목적지 명사를 연결합니다. (예: access to information 정보 접근성).",
      pattern: "• <strong>in the sense that [절]</strong><br>  - 활용 예: He is a leader in the sense that he listens to people. (그가 백성들의 아픈 목소리에 귀를 기울여 준다는 점에서 그는 진정한 참된 리더다.)"
    }
  },
  {
    id: "sunak_11",
    speaker: "Rishi Sunak",
    en: "Perfect. Yeah, that's a... well, that's a... that is a great note to end on. I think that, you know, we're all want that, that better future. We think it's there. The promise of it is certainly there...",
    ko: "완벽합니다. 끝맺기에 정말 훌륭한 말씀이네요. 우리 모두는 더 나은 미래를 원하고, 그것이 저기 있다고 믿습니다. 그 가능성은 확실히 존재하니까요...",
    notes: {
      words: [
        { word: "perfect", meaning: "흠잡을 데 없이 완벽한, 더할 나위 없는" },
        { word: "promise", meaning: "약속, (미래에 대한) 촉망받는 약속, 밝은 전망" },
        { word: "certainly", meaning: "의문의 여지 없이 당연히" }
      ],
      structure: "• <strong>Perfect. Yeah, that is a great note to end on</strong> (판타스틱합니다! 정말 한 폭의 그림 같은 명대사로 끝맺기에 알맞은 감동적인 문장이네요) / <strong>I think that we all want that better future</strong> (우리 모두 한마음 한뜻으로 그런 따스하고 찬란한 내일을 고대하고 있지 않습니까) / <strong>We think it's there</strong> (우리는 그 밝은 유토피아가 가닿을 거리에 이미 와 있다고 확신합니다) / <strong>The promise of it is certainly there</strong> (기술의 긍정적인 약속과 희망은 분명 눈앞에 또렷이 피어오르고 있으니까요)",
      mustMemorize: "• <strong>a great note to end on</strong>: 연설이나 음악 연주, 혹은 진지한 토의 세션을 특유의 멋진 마침표 기분(note)을 남기고 깔끔하게 정리해 닫는다는 대단히 품위 있고 교양 있는 마무리 관용구입니다.<br>• <strong>promise</strong>: 사람 간의 약속 외에도, 어떤 신기술이나 젊은 청년 인재가 가진 '앞으로 무한하게 뻗어 나갈 희망의 씨앗과 장래 촉망되는 전망'을 묘사하는 주옥같은 문학적 어휘입니다.",
      pattern: "• <strong>[사안] is a great note to end on</strong><br>  - 활용 예: Sharing this delicious dessert is a great note to end our dinner on. (이 입안에서 살살 녹는 환상적인 디저트를 서로 나누어 먹는 것이야말로 완벽한 저녁 식사의 피날레다.)"
    }
  }
];
