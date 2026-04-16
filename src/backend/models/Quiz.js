// Why: store quizzes created by teacher or AI.
// models/Quiz.js
import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  question: String,
  options: [String],
  correctAnswer: String,
  correctAnswerOption:String,
  explanation:String,
  type:String, // mcq
  difficulty:String,
  context:String,
  sub_topics:[String]
});

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    time:{type:String ,required:true},
    date : {type :Date},
    status:{type:String},
    questions: [questionSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    //aiGenerated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Quiz", quizSchema);



