export interface Env {
	DB: D1Database;
	AI: Ai;
}

// Types for our data
interface FeedbackItem {
	id?: number;
	source: string;
	content: string;
	author?: string;
	sentiment?: string;
	urgency?: string;
	themes?: string;
	created_at?: string;
	processed_at?: string;
}

interface Digest {
	id?: number;
	summary: string;
	top_themes: string;
	urgent_items: string;
	sentiment_breakdown: string;
	feedback_count: number;
	created_at?: string;
}

// Mock data for seeding
const mockFeedback: Omit<FeedbackItem, 'id' | 'sentiment' | 'urgency' | 'themes' | 'processed_at'>[] = [
	{
		source: 'discord',
		content: 'The Workers deployment is super slow today. Took almost 2 minutes to deploy a simple change. Anyone else experiencing this?',
		author: 'dev_sarah',
		created_at: new Date(Date.now() - 3600000).toISOString()
	},
	{
		source: 'github',
		content: 'Bug: wrangler dev crashes when using D1 bindings locally. Error: "Cannot read property of undefined". Steps to reproduce attached.',
		author: 'clouduser42',
		created_at: new Date(Date.now() - 7200000).toISOString()
	},
	{
		source: 'support_ticket',
		content: 'URGENT: Our production Workers are returning 503 errors intermittently. This is affecting our checkout flow. Please escalate immediately.',
		author: 'enterprise_client',
		created_at: new Date(Date.now() - 1800000).toISOString()
	},
	{
		source: 'twitter',
		content: 'Just deployed my first @Cloudflare Worker and wow, the DX is incredible! From zero to production in 10 minutes. 🚀',
		author: '@happy_developer',
		created_at: new Date(Date.now() - 5400000).toISOString()
	},
	{
		source: 'discord',
		content: 'Is there any way to increase the CPU time limit for Workers? 50ms is not enough for my AI inference workload.',
		author: 'ml_engineer',
		created_at: new Date(Date.now() - 9000000).toISOString()
	},
	{
		source: 'github',
		content: 'Feature request: Please add native support for WebSockets in Durable Objects without the need for workarounds.',
		author: 'realtime_dev',
		created_at: new Date(Date.now() - 10800000).toISOString()
	},
	{
		source: 'support_ticket',
		content: 'Billing question: We were charged for requests that returned errors. Shouldn\'t failed requests be excluded from billing?',
		author: 'startup_founder',
		created_at: new Date(Date.now() - 14400000).toISOString()
	},
	{
		source: 'twitter',
		content: 'The Cloudflare docs are confusing. Spent 3 hours trying to figure out how to set up KV bindings. Need better examples.',
		author: '@frustrated_coder',
		created_at: new Date(Date.now() - 18000000).toISOString()
	},
	{
		source: 'discord',
		content: 'Love the new Workers AI! The Llama integration is seamless. Built a chatbot in under an hour.',
		author: 'ai_enthusiast',
		created_at: new Date(Date.now() - 21600000).toISOString()
	},
	{
		source: 'github',
		content: 'Documentation bug: The D1 SQL syntax examples show deprecated commands. Please update to current API.',
		author: 'docs_contributor',
		created_at: new Date(Date.now() - 25200000).toISOString()
	},
	{
		source: 'support_ticket',
		content: 'How do I migrate from AWS Lambda to Cloudflare Workers? Looking for a migration guide or best practices document.',
		author: 'migration_team',
		created_at: new Date(Date.now() - 28800000).toISOString()
	},
	{
		source: 'twitter',
		content: 'Cloudflare Workers pricing is unbeatable. Moved our entire API and saving 70% compared to AWS. Highly recommend!',
		author: '@cost_saver',
		created_at: new Date(Date.now() - 32400000).toISOString()
	}
];

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		// CORS headers for all responses
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		try {
			// Route handling
			if (path === '/' && request.method === 'GET') {
				return handleHome(env, corsHeaders);
			}

			if (path === '/api/feedback' && request.method === 'POST') {
				return await handleAddFeedback(request, env, corsHeaders);
			}

			if (path === '/api/feedback' && request.method === 'GET') {
				return await handleGetFeedback(env, corsHeaders);
			}

			if (path === '/api/digest' && request.method === 'GET') {
				return await handleGetDigest(env, corsHeaders);
			}

			if (path === '/api/digest/generate' && request.method === 'POST') {
				return await handleGenerateDigest(env, corsHeaders);
			}

			if (path === '/api/seed' && request.method === 'POST') {
				return await handleSeedData(env, corsHeaders);
			}

			if (path === '/api/init' && request.method === 'POST') {
				return await handleInitDb(env, corsHeaders);
			}

			if (path === '/webhook/slack' && request.method === 'GET') {
				return await handleSlackWebhook(env, corsHeaders);
			}

			return new Response(JSON.stringify({ error: 'Not Found' }), { 
				status: 404, 
				headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
			});
		} catch (error) {
			console.error('Error:', error);
			return new Response(JSON.stringify({ error: 'Internal Server Error', details: String(error) }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
	},
};

// Initialize database tables
async function handleInitDb(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	try {
		await env.DB.prepare(`
			CREATE TABLE IF NOT EXISTS feedback (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				source TEXT NOT NULL,
				content TEXT NOT NULL,
				author TEXT,
				sentiment TEXT,
				urgency TEXT,
				themes TEXT,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				processed_at DATETIME
			)
		`).run();
		
		await env.DB.prepare(`
			CREATE TABLE IF NOT EXISTS digests (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				summary TEXT NOT NULL,
				top_themes TEXT,
				urgent_items TEXT,
				sentiment_breakdown TEXT,
				feedback_count INTEGER,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP
			)
		`).run();

		return new Response(JSON.stringify({ success: true, message: 'Database initialized' }), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	} catch (error) {
		return new Response(JSON.stringify({ success: false, error: String(error) }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
}

// Seed mock data
async function handleSeedData(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	let seededCount = 0;

	for (const feedback of mockFeedback) {
		// Analyse with AI
		const analysis = await analyseFeedback(env, feedback.content);

		await env.DB.prepare(
			`INSERT INTO feedback (source, content, author, sentiment, urgency, themes, created_at, processed_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
		)
			.bind(
				feedback.source,
				feedback.content,
				feedback.author || null,
				analysis.sentiment,
				analysis.urgency,
				analysis.themes,
				feedback.created_at
			)
			.run();
		seededCount++;
	}

	return new Response(JSON.stringify({ success: true, message: `Seeded ${seededCount} feedback items with AI analysis` }), {
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

// Analyse feedback using Workers AI
async function analyseFeedback(env: Env, content: string): Promise<{ sentiment: string; urgency: string; themes: string }> {
	const prompt = `Analyse this customer feedback and respond with ONLY a JSON object (no markdown, no explanation):
{
  "sentiment": "positive" or "negative" or "neutral",
  "urgency": "high" or "medium" or "low",
  "themes": "comma-separated list of 1-3 themes like: performance, billing, documentation, feature-request, bug, praise"
}

Feedback: "${content}"`;

	try {
		const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct' as any, {
			prompt: prompt,
			max_tokens: 150,
		} as any);

		const text = (response as { response?: string }).response || '';
		
		// Try to parse JSON from response
		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const parsed = JSON.parse(jsonMatch[0]);
			return {
				sentiment: parsed.sentiment || 'neutral',
				urgency: parsed.urgency || 'medium',
				themes: parsed.themes || 'general',
			};
		}
	} catch (e) {
		console.error('AI analysis error:', e);
	}

	// Fallback if AI fails
	return { sentiment: 'neutral', urgency: 'medium', themes: 'general' };
}

// Add new feedback
async function handleAddFeedback(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	const body = await request.json() as Partial<FeedbackItem>;

	if (!body.source || !body.content) {
		return new Response(JSON.stringify({ error: 'source and content are required' }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}

	// Analyse with AI
	const analysis = await analyseFeedback(env, body.content);

	const result = await env.DB.prepare(
		`INSERT INTO feedback (source, content, author, sentiment, urgency, themes, processed_at)
		 VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
	)
		.bind(body.source, body.content, body.author || null, analysis.sentiment, analysis.urgency, analysis.themes)
		.run();

	return new Response(JSON.stringify({ success: true, id: result.meta.last_row_id, analysis }), {
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

// Get all feedback
async function handleGetFeedback(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	const result = await env.DB.prepare('SELECT * FROM feedback ORDER BY created_at DESC').all();

	return new Response(JSON.stringify(result.results), {
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

// Generate digest using AI
async function handleGenerateDigest(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	// Get recent feedback (last 24 hours worth or all if less)
	const feedback = await env.DB.prepare(
		`SELECT * FROM feedback ORDER BY created_at DESC LIMIT 50`
	).all();

	if (!feedback.results || feedback.results.length === 0) {
		return new Response(JSON.stringify({ error: 'No feedback to analyse' }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}

	const feedbackSummary = feedback.results.map((f: any) => 
		`[${f.source}] (${f.sentiment}, ${f.urgency} urgency): ${f.content}`
	).join('\n');

	const prompt = `You are a product manager assistant. Analyse this customer feedback and create a daily digest.

FEEDBACK:
${feedbackSummary}

Create a digest with these sections. Respond with ONLY a JSON object:
{
  "summary": "2-3 sentence executive summary of today's feedback",
  "top_themes": ["theme1: count and brief description", "theme2: count and brief description", "theme3: count and brief description"],
  "urgent_items": ["brief description of urgent item 1", "brief description of urgent item 2"],
  "sentiment_breakdown": {"positive": number, "neutral": number, "negative": number},
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2"]
}`;

	let digestData: any = {
		summary: 'Unable to generate summary',
		top_themes: [],
		urgent_items: [],
		sentiment_breakdown: { positive: 0, neutral: 0, negative: 0 },
		recommendations: [],
	};

	try {
		const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct' as any, {
			prompt: prompt,
			max_tokens: 800,
		} as any);

		const text = (response as { response?: string }).response || '';
		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			digestData = JSON.parse(jsonMatch[0]);
		}
	} catch (e) {
		console.error('Digest generation error:', e);
	}

	// Store the digest
	await env.DB.prepare(
		`INSERT INTO digests (summary, top_themes, urgent_items, sentiment_breakdown, feedback_count)
		 VALUES (?, ?, ?, ?, ?)`
	)
		.bind(
			digestData.summary,
			JSON.stringify(digestData.top_themes),
			JSON.stringify(digestData.urgent_items),
			JSON.stringify(digestData.sentiment_breakdown),
			feedback.results.length
		)
		.run();

	return new Response(JSON.stringify({ success: true, digest: digestData, feedback_count: feedback.results.length }), {
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

// Get latest digest
async function handleGetDigest(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	const result = await env.DB.prepare(
		'SELECT * FROM digests ORDER BY created_at DESC LIMIT 1'
	).first();

	if (!result) {
		return new Response(JSON.stringify({ error: 'No digest available. Generate one first.' }), {
			status: 404,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}

	// Parse JSON fields
	const digest = {
		...result,
		top_themes: JSON.parse(result.top_themes as string || '[]'),
		urgent_items: JSON.parse(result.urgent_items as string || '[]'),
		sentiment_breakdown: JSON.parse(result.sentiment_breakdown as string || '{}'),
	};

	return new Response(JSON.stringify(digest), {
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

// Slack-ready webhook endpoint
async function handleSlackWebhook(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	const result = await env.DB.prepare(
		'SELECT * FROM digests ORDER BY created_at DESC LIMIT 1'
	).first();

	if (!result) {
		return new Response(JSON.stringify({
			text: "No digest available yet. Visit the dashboard to generate one.",
		}), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}

	const topThemes = JSON.parse(result.top_themes as string || '[]');
	const urgentItems = JSON.parse(result.urgent_items as string || '[]');
	const sentimentBreakdown = JSON.parse(result.sentiment_breakdown as string || '{}');

	// Format for Slack
	const slackMessage = {
		blocks: [
			{
				type: "header",
				text: { type: "plain_text", text: "📊 Daily Feedback Pulse", emoji: true }
			},
			{
				type: "section",
				text: { type: "mrkdwn", text: `*Summary*\n${result.summary}` }
			},
			{
				type: "section",
				text: { type: "mrkdwn", text: `*Sentiment*\n✅ Positive: ${sentimentBreakdown.positive || 0} | 😐 Neutral: ${sentimentBreakdown.neutral || 0} | ❌ Negative: ${sentimentBreakdown.negative || 0}` }
			},
			{
				type: "section",
				text: { type: "mrkdwn", text: `*Top Themes*\n${topThemes.map((t: string) => `• ${t}`).join('\n') || 'None identified'}` }
			},
			{
				type: "section",
				text: { type: "mrkdwn", text: `*🚨 Urgent Items*\n${urgentItems.map((u: string) => `• ${u}`).join('\n') || 'None'}` }
			},
			{
				type: "context",
				elements: [{ type: "mrkdwn", text: `Based on ${result.feedback_count} feedback items | Generated ${result.created_at}` }]
			}
		]
	};

	return new Response(JSON.stringify(slackMessage), {
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

// Home page with UI
async function handleHome(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Feedback Pulse - Daily Digest</title>
	<style>
		* { box-sizing: border-box; margin: 0; padding: 0; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
			min-height: 100vh;
			color: #e0e0e0;
			padding: 2rem;
		}
		.container { max-width: 900px; margin: 0 auto; }
		h1 {
			font-size: 2.5rem;
			margin-bottom: 0.5rem;
			background: linear-gradient(90deg, #f97316, #fb923c);
			-webkit-background-clip: text;
			-webkit-text-fill-color: transparent;
		}
		.subtitle { color: #94a3b8; margin-bottom: 2rem; }
		.card {
			background: rgba(255,255,255,0.05);
			border-radius: 16px;
			padding: 1.5rem;
			margin-bottom: 1.5rem;
			border: 1px solid rgba(255,255,255,0.1);
		}
		.card h2 {
			font-size: 1.1rem;
			color: #f97316;
			margin-bottom: 1rem;
			display: flex;
			align-items: center;
			gap: 0.5rem;
		}
		.summary { font-size: 1.1rem; line-height: 1.6; }
		.sentiment-bar {
			display: flex;
			height: 8px;
			border-radius: 4px;
			overflow: hidden;
			margin: 1rem 0;
		}
		.sentiment-positive { background: #22c55e; }
		.sentiment-neutral { background: #eab308; }
		.sentiment-negative { background: #ef4444; }
		.sentiment-labels {
			display: flex;
			justify-content: space-between;
			font-size: 0.85rem;
			color: #94a3b8;
		}
		.theme-tag {
			display: inline-block;
			background: rgba(249, 115, 22, 0.2);
			color: #fb923c;
			padding: 0.5rem 1rem;
			border-radius: 20px;
			margin: 0.25rem;
			font-size: 0.9rem;
		}
		.urgent-item {
			background: rgba(239, 68, 68, 0.1);
			border-left: 3px solid #ef4444;
			padding: 0.75rem 1rem;
			margin: 0.5rem 0;
			border-radius: 0 8px 8px 0;
		}
		.btn {
			background: linear-gradient(90deg, #f97316, #ea580c);
			color: white;
			border: none;
			padding: 0.75rem 1.5rem;
			border-radius: 8px;
			cursor: pointer;
			font-size: 1rem;
			font-weight: 600;
			margin-right: 0.5rem;
			margin-bottom: 0.5rem;
			transition: transform 0.2s, box-shadow 0.2s;
		}
		.btn:hover {
			transform: translateY(-2px);
			box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
		}
		.btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
		.btn-secondary {
			background: rgba(255,255,255,0.1);
			border: 1px solid rgba(255,255,255,0.2);
		}
		.btn-secondary:hover {
			background: rgba(255,255,255,0.15);
			box-shadow: 0 4px 12px rgba(0,0,0,0.2);
		}
		.actions { margin-bottom: 2rem; }
		.status {
			padding: 1rem;
			border-radius: 8px;
			margin-top: 1rem;
			display: none;
		}
		.status.success { display: block; background: rgba(34, 197, 94, 0.2); color: #86efac; }
		.status.error { display: block; background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
		.status.loading { display: block; background: rgba(249, 115, 22, 0.2); color: #fdba74; }
		.empty-state {
			text-align: center;
			padding: 3rem;
			color: #64748b;
		}
		.empty-state p { margin-bottom: 1rem; }
		.meta { font-size: 0.85rem; color: #64748b; margin-top: 1rem; }
		.architecture {
			font-size: 0.9rem;
			color: #94a3b8;
		}
		.architecture code {
			background: rgba(255,255,255,0.1);
			padding: 0.2rem 0.5rem;
			border-radius: 4px;
			font-family: monospace;
		}
		.feedback-list { max-height: 300px; overflow-y: auto; }
		.feedback-item {
			padding: 0.75rem;
			border-bottom: 1px solid rgba(255,255,255,0.05);
		}
		.feedback-item:last-child { border-bottom: none; }
		.feedback-source {
			font-size: 0.75rem;
			text-transform: uppercase;
			color: #f97316;
			margin-bottom: 0.25rem;
		}
		.feedback-content { font-size: 0.9rem; }
		.feedback-meta {
			font-size: 0.75rem;
			color: #64748b;
			margin-top: 0.25rem;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>📊 Feedback Pulse</h1>
		<p class="subtitle">AI-powered daily digest of your product feedback</p>

		<div class="actions">
			<button class="btn" onclick="initDb()">1. Init Database</button>
			<button class="btn" onclick="seedData()">2. Seed Mock Data</button>
			<button class="btn" onclick="generateDigest()">3. Generate Digest</button>
			<button class="btn btn-secondary" onclick="viewFeedback()">View All Feedback</button>
			<button class="btn btn-secondary" onclick="viewSlackFormat()">View Slack Format</button>
		</div>

		<div id="status" class="status"></div>

		<div id="digest-container">
			<div class="empty-state">
				<p>No digest generated yet.</p>
				<p>Click the buttons above in order: Init → Seed → Generate</p>
			</div>
		</div>

		<div class="card architecture">
			<h2>🏗️ Architecture</h2>
			<p>Built with Cloudflare Developer Platform:</p>
			<ul style="margin-top: 0.5rem; margin-left: 1.5rem;">
				<li><code>Workers</code> — Serverless API handling all requests</li>
				<li><code>D1</code> — SQL database storing feedback &amp; digests</li>
				<li><code>Workers AI</code> — Llama 3.1 for sentiment analysis &amp; summarisation</li>
			</ul>
		</div>
	</div>

	<script>
		const status = document.getElementById('status');
		const digestContainer = document.getElementById('digest-container');

		function showStatus(message, type) {
			status.textContent = message;
			status.className = 'status ' + type;
		}

		async function initDb() {
			showStatus('Initialising database...', 'loading');
			try {
				const res = await fetch('/api/init', { method: 'POST' });
				const data = await res.json();
				showStatus(data.message || 'Database initialised!', 'success');
			} catch (e) {
				showStatus('Error: ' + e.message, 'error');
			}
		}

		async function seedData() {
			showStatus('Seeding mock data with AI analysis (this may take 30-60 seconds)...', 'loading');
			try {
				const res = await fetch('/api/seed', { method: 'POST' });
				const data = await res.json();
				showStatus(data.message || 'Data seeded!', 'success');
			} catch (e) {
				showStatus('Error: ' + e.message, 'error');
			}
		}

		async function generateDigest() {
			showStatus('Generating AI digest...', 'loading');
			try {
				const res = await fetch('/api/digest/generate', { method: 'POST' });
				const data = await res.json();
				if (data.error) {
					showStatus(data.error, 'error');
					return;
				}
				showStatus('Digest generated!', 'success');
				displayDigest(data.digest, data.feedback_count);
			} catch (e) {
				showStatus('Error: ' + e.message, 'error');
			}
		}

		async function viewFeedback() {
			showStatus('Loading feedback...', 'loading');
			try {
				const res = await fetch('/api/feedback');
				const data = await res.json();
				if (data.length === 0) {
					showStatus('No feedback found. Seed data first.', 'error');
					return;
				}
				showStatus('Loaded ' + data.length + ' items', 'success');
				displayFeedback(data);
			} catch (e) {
				showStatus('Error: ' + e.message, 'error');
			}
		}

		async function viewSlackFormat() {
			showStatus('Loading Slack format...', 'loading');
			try {
				const res = await fetch('/webhook/slack');
				const data = await res.json();
				showStatus('Slack webhook payload ready!', 'success');
				digestContainer.innerHTML = '<div class="card"><h2>📤 Slack Webhook Payload</h2><pre style="overflow-x:auto;font-size:0.8rem;color:#94a3b8;">' + JSON.stringify(data, null, 2) + '</pre></div>';
			} catch (e) {
				showStatus('Error: ' + e.message, 'error');
			}
		}

		function displayDigest(digest, count) {
			const sentiment = digest.sentiment_breakdown || {};
			const total = (sentiment.positive || 0) + (sentiment.neutral || 0) + (sentiment.negative || 0) || 1;
			
			digestContainer.innerHTML = \`
				<div class="card">
					<h2>📝 Executive Summary</h2>
					<p class="summary">\${digest.summary || 'No summary available'}</p>
				</div>

				<div class="card">
					<h2>📈 Sentiment Breakdown</h2>
					<div class="sentiment-bar">
						<div class="sentiment-positive" style="width: \${(sentiment.positive || 0) / total * 100}%"></div>
						<div class="sentiment-neutral" style="width: \${(sentiment.neutral || 0) / total * 100}%"></div>
						<div class="sentiment-negative" style="width: \${(sentiment.negative || 0) / total * 100}%"></div>
					</div>
					<div class="sentiment-labels">
						<span>✅ Positive: \${sentiment.positive || 0}</span>
						<span>😐 Neutral: \${sentiment.neutral || 0}</span>
						<span>❌ Negative: \${sentiment.negative || 0}</span>
					</div>
				</div>

				<div class="card">
					<h2>🏷️ Top Themes</h2>
					<div>\${(digest.top_themes || []).map(t => '<span class="theme-tag">' + t + '</span>').join('') || 'No themes identified'}</div>
				</div>

				<div class="card">
					<h2>🚨 Urgent Items</h2>
					\${(digest.urgent_items || []).map(u => '<div class="urgent-item">' + u + '</div>').join('') || '<p>No urgent items</p>'}
				</div>

				<div class="card">
					<h2>💡 Recommendations</h2>
					<ul style="margin-left: 1.5rem;">
						\${(digest.recommendations || []).map(r => '<li style="margin: 0.5rem 0;">' + r + '</li>').join('') || '<li>No recommendations</li>'}
					</ul>
				</div>

				<p class="meta">Based on \${count} feedback items</p>
			\`;
		}

		function displayFeedback(items) {
			digestContainer.innerHTML = \`
				<div class="card">
					<h2>📋 All Feedback (\${items.length} items)</h2>
					<div class="feedback-list">
						\${items.map(f => \`
							<div class="feedback-item">
								<div class="feedback-source">\${f.source}</div>
								<div class="feedback-content">\${f.content}</div>
								<div class="feedback-meta">
									\${f.author ? 'By ' + f.author + ' • ' : ''}
									Sentiment: \${f.sentiment || 'unknown'} • 
									Urgency: \${f.urgency || 'unknown'} • 
									Themes: \${f.themes || 'none'}
								</div>
							</div>
						\`).join('')}
					</div>
				</div>
			\`;
		}

		// Load existing digest on page load
		fetch('/api/digest')
			.then(r => r.json())
			.then(data => {
				if (!data.error) {
					displayDigest({
						summary: data.summary,
						top_themes: data.top_themes,
						urgent_items: data.urgent_items,
						sentiment_breakdown: data.sentiment_breakdown,
						recommendations: []
					}, data.feedback_count);
				}
			})
			.catch(() => {});
	</script>
</body>
</html>`;

	return new Response(html, {
		headers: { ...corsHeaders, 'Content-Type': 'text/html' },
	});
}