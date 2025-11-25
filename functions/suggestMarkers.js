{
  "name": "Quiz",
  "type": "object",
  "properties": {
    "broadcast_id": {
      "type": "string",
      "description": "\u0645\u0639\u0631\u0641 \u0627\u0644\u0628\u062b \u0627\u0644\u0645\u0631\u062a\u0628\u0637"
    },
    "recording_id": {
      "type": "string",
      "description": "\u0645\u0639\u0631\u0641 \u0627\u0644\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u0645\u0631\u062a\u0628\u0637"
    },
    "series_id": {
      "type": "string",
      "description": "\u0645\u0639\u0631\u0641 \u0627\u0644\u0633\u0644\u0633\u0644\u0629 \u0627\u0644\u0645\u0631\u062a\u0628\u0637\u0629"
    },
    "marker_id": {
      "type": "string",
      "description": "\u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u0644\u0627\u0645\u0629 \u0627\u0644\u0632\u0645\u0646\u064a\u0629 \u0627\u0644\u0645\u0631\u062a\u0628\u0637\u0629"
    },
    "title": {
      "type": "string",
      "description": "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631"
    },
    "description": {
      "type": "string",
      "description": "\u0648\u0635\u0641 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631"
    },
    "questions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "question": {
            "type": "string"
          },
          "options": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "correct_answer": {
            "type": "number"
          },
          "explanation": {
            "type": "string"
          }
        },
        "required": [
          "question",
          "options",
          "correct_answer"
        ]
      },
      "description": "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0623\u0633\u0626\u0644\u0629"
    },
    "passing_score": {
      "type": "number",
      "default": 70,
      "description": "\u0627\u0644\u0646\u0633\u0628\u0629 \u0627\u0644\u0645\u0626\u0648\u064a\u0629 \u0644\u0644\u0646\u062c\u0627\u062d"
    },
    "time_limit_minutes": {
      "type": "number",
      "description": "\u0645\u062f\u0629 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631 \u0628\u0627\u0644\u062f\u0642\u0627\u0626\u0642 (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)"
    },
    "is_active": {
      "type": "boolean",
      "default": true,
      "description": "\u0647\u0644 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631 \u0646\u0634\u0637"
    },
    "is_featured": {
      "type": "boolean",
      "default": false,
      "description": "\u0647\u0644 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631 \u0645\u0645\u064a\u0632"
    }
  },
  "required": [
    "title",
    "questions"
  ]
}