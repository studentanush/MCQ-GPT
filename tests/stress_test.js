import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:5000"; 
const ADMIN_URL = "http://localhost:5000/admin";
const PLAYER_COUNT = 500;

const quizData = {
    "_id": "69395e3ffb09f6806506c8a5",
    "title": "Stress Test Quiz",
    "time": "10 minutes",
    "questions": [
        {
            "_id": "q1",
            "question": "What is 2+2?",
            "options": ["3", "4", "5", "6"],
            "correctAnswerOption": "B",
            "correctAnswer": "4"
        }
    ]
};

async function runTest() {
    console.log("🚀 Initializing Stress Test...");

    // 1. Connect as Admin
    const adminSocket = io(ADMIN_URL);
    
    adminSocket.on("connect", () => {
        console.log("👑 Admin connected.");
        
        // 2. Create Room
        adminSocket.emit("createRoom", { hostName: "StressTester", quizD: quizData }, (response) => {
            const roomCode = response.roomCode;
            console.log(`🏠 Room created: ${roomCode}`);
            
            startPlayers(roomCode, adminSocket);
        });
    });
}

function startPlayers(roomCode, adminSocket) {
    let joinedCount = 0;
    const players = [];

    console.log(`👥 Spawning ${PLAYER_COUNT} players...`);

    for (let i = 0; i < PLAYER_COUNT; i++) {
        const socket = io(SERVER_URL);
        
        socket.on("connect", () => {
            socket.emit("joinRoom", {
                roomCode: roomCode,
                playerName: `Bot-${i}`,
                playerEmail: `bot${i}@test.com`,
                studentId: "65f1a5b4c3d2e1a0f9b8d7c6" // Dummy ID
            }, (res) => {
                if (res.success) {
                    joinedCount++;
                    if (joinedCount % 20 === 0) console.log(`✅ ${joinedCount} players joined...`);
                    
                    if (joinedCount === PLAYER_COUNT) {
                        console.log("🎉 All players joined. Admin starting quiz...");
                        setTimeout(() => {
                            adminSocket.emit("playOnOff", { roomCode, play: true }, (res) => {
                                if (res.status === "ok") {
                                    console.log("▶️ Quiz started!");
                                    // Emit first question
                                    adminSocket.emit("sendQuestion", { roomCode, questionIndex: 0 });
                                }
                            });
                        }, 2000);
                    }
                }
            });
        });

        socket.on("newQuestion", (data) => {
            // Random delay to simulate real human response time
            setTimeout(() => {
                socket.emit("submitAnswer", {
                    roomCode: roomCode,
                    answer: "B",
                    timeTaken: 2,
                    totalTime: data.totalTime
                }, (res) => {
                    // Answered
                });
            }, Math.random() * 3000);
        });

        players.push(socket);
    }

    adminSocket.on("questionStats", (stats) => {
        console.log(`📊 Stats: ${stats.answeredCount}/${stats.totalPlayers} answered`);
        if (stats.answeredCount === PLAYER_COUNT) {
            console.log("🏆 All players answered. Stress test successful!");
            process.exit(0);
        }
    });
}

runTest().catch(console.error);
