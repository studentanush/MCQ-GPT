import { useState } from 'react'

import './App.css'
import { Route, Routes } from 'react-router-dom'
import Player from './pages/Player'
import Admin from './pages/Admin'
import EducatorDashboard from './pages/Educator/Dashboard'
import LiveQuiz from './pages/Educator/LiveQuiz'
import GeneratedQuizzes from './pages/Educator/GeneratedQuizzes'
import Chat from './pages/Educator/chat'
import AttendQuiz from './pages/Student/AttendQuiz'
import LandingPage from './pages/Landing/LandingPage'
import Login from './pages/Auth/login'
import Register from './pages/Auth/Register'
import StudentDashboard from './pages/Student/StudentDashboard'
import Reports from './pages/Educator/Reports'
import { ToastContainer } from 'react-toastify'
import StudentReport from './pages/Student/StudentReport'
import StudentReports from './pages/Student/Reports'

function App() {
  //const isAuthenticatedStudent = 

    return (
    <>
      <ToastContainer/>
      <Routes>
          
        <Route path = "/player" element = {<Player/>}></Route>
        <Route path="/adminQ" element = {<Admin/>}></Route>
        <Route path="/educator/dashboard" element = {<EducatorDashboard/>}></Route> 
        <Route path="/educator/live-quiz/:id" element = {<LiveQuiz/>}></Route> 
        <Route path="/educator/generated" element = {<GeneratedQuizzes/>}></Route> 
        <Route path="/educator/chat" element = {<Chat/>}></Route> 
        <Route path="/attend-quiz/:quizId" element = {<AttendQuiz/>}></Route> 
        <Route path="/" element = {<LandingPage/>}></Route> 
        <Route path="/login" element = {<Login/>}></Route> 
        <Route path="/register" element = {<Register/>}></Route> 
        <Route path="/student/dashboard" element = {<StudentDashboard/>}></Route> 
        <Route path="/student/reports" element = {<StudentReports/>}></Route> 
        <Route path="/educator/reports" element = {<Reports/>}></Route> 
        <Route path="/student/report/:submissionId" element = {<StudentReport/>}></Route> 
       
      </Routes>
    </>
  ) 
}

export default App
