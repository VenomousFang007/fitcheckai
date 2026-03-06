import { ensureWeeklyStyleChallenge } from './lib/styleChallengeEngine';
import 'dotenv/config';

// Using a user_id from auth.users that we saw earlier
const TEST_USER_ID = "823b4fbe-3ec0-450f-a1a5-96536dfa3b65";

async function testEngine() {
    console.log("Testing ensureWeeklyStyleChallenge...");
    try {
        const challenge = await ensureWeeklyStyleChallenge(TEST_USER_ID);
        console.log("Result:", challenge);
        if (challenge && challenge.primary_challenge && challenge.primary_challenge !== "Try a completely new styling combination this week.") {
            console.log("AI INTEGRATION PASS: Real challenge generated.");
        } else {
            console.log("AI INTEGRATION FAIL: Fallback used.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

testEngine();
