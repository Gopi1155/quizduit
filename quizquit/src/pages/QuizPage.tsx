const generateQuestionsWithAI = async (
  subjectName: string,
  levelNum: number,
  roundNum: number,
  subjectDifficulty: string
): Promise<Question[]> => {

  // ✅ Correct way for Vite
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.error("❌ VITE_GEMINI_API_KEY missing");
    return generateDummyQuestions(subjectName, levelNum, roundNum);
  }

  const genAI = new GoogleGenAI({ apiKey });

  const prompt = `
Generate exactly 10 multiple-choice questions.

Subject: ${subjectName}
Level: ${levelNum}
Round: ${roundNum}
Difficulty: ${subjectDifficulty}

Rules:
- 4 options per question
- correctAnswer must match one option
- No explanations
- Return ONLY valid JSON array

Format:
[
  {
    "text": "Question?",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "A"
  }
]
`;

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
    });

    let text = response.text?.trim();

    // ✅ FIX: Remove markdown ```json ``` if exists
    if (text.startsWith("```")) {
      text = text.replace(/```json|```/g, "").trim();
    }

    // ✅ SAFE JSON PARSE
    let data: any[];
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("❌ Invalid JSON from AI:", text);
      return generateDummyQuestions(subjectName, levelNum, roundNum);
    }

    // ✅ VALIDATE DATA
    if (!Array.isArray(data) || data.length !== 10) {
      console.error("❌ AI returned wrong format");
      return generateDummyQuestions(subjectName, levelNum, roundNum);
    }

    const generatedQuestions: Question[] = [];

    for (const qData of data) {

      // ✅ EXTRA VALIDATION
      if (
        !qData.text ||
        !Array.isArray(qData.options) ||
        qData.options.length !== 4 ||
        !qData.correctAnswer
      ) {
        console.warn("⚠️ Skipping invalid question:", qData);
        continue;
      }

      const newQ = {
        text: qData.text,
        options: qData.options,
        correctAnswer: qData.correctAnswer,
        subjectId: subjectId!,
        level: levelNum,
        round: roundNum as 1 | 2 | 3
      };

      const docRef = await addDoc(collection(db, 'questions'), newQ);
      generatedQuestions.push({ id: docRef.id, ...newQ });
    }

    // ✅ FINAL FALLBACK CHECK
    if (generatedQuestions.length === 0) {
      return generateDummyQuestions(subjectName, levelNum, roundNum);
    }

    return generatedQuestions;

  } catch (error) {
    console.error("❌ AI ERROR:", error);
    return generateDummyQuestions(subjectName, levelNum, roundNum);
  }
};
