import mongoose from "mongoose";

const responseSchema = new mongoose.Schema({
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" }, // Best to ref properly
    answer: String,
    status: String, // 'answered', 'skipped'
    marked: String,
    timestamp: { type: Date, default: Date.now }
});

const participationSchema = new mongoose.Schema(
    {
        quizID: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
        studentID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        timeTaken: { type: String },
        studentResponse: [responseSchema],
        score: { type: Number, default: 0 },
        totalQuestions: { type: Number, default: 0 }
    },
    { timestamps: true }
);

const Participation = mongoose.model("Participation", participationSchema);
export default Participation;
