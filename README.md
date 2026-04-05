# 🔋 AI Battery Intelligence Dashboard

Welcome to the **AI Battery Intelligence Dashboard**, a dual-layered AI project leveraging **Groq's Mixtral-8x7B** and **LangChain**. It features both a fully statically-hostable premium web dashboard (ready for GitHub Pages) and a powerful, interactive Python terminal agent. 

---

## 🎨 1. Premium Web Dashboard (GitHub Pages Ready)

The frontend is a self-contained, aesthetically stunning glassmorphism UI. It calculates trajectories locally while fetching intelligent, context-aware suggestions directly from the Groq Cloud API completely in the browser.

### Features:
- ✨ **Premium Glassmorphism Design:** Fluid animations and deep dark-mode gradients.
- 📉 **Real-Time Visualizations:** Dynamic Chart.js forecasting depletion horizons.
- 🤯 **Edge AI Integration:** Connects directly to Groq's edge API entirely inside JavaScript (no server needed!).

### How to Deploy
1. Simply upload `index.html`, `style.css`, and `app.js` to any static server or **GitHub Pages**.
2. Enter your Groq API key securely on the webpage to generate insights!

---

## 🐍 2. Python Terminal Agent (VS Code Ready)

An exact technical implementation of the `Conversational-React-Description` paradigm using LangChain agents and Tool encapsulation.

### Features
- 🧠 Built heavily atop `langchain` and `langchain-groq`.
- ⚙️ Encapsulates calculations gracefully within a `battery_predict` Tool.
- 💬 Features a `ConversationBufferMemory` infinite loop to contextualize past interactions.

### Setup Instructions
1. Open your terminal in this repository.
2. Install the necessary libraries:
   ```bash
   pip install -r requirements.txt
   ```
3. Export your Groq API Key into the environment variables:
   - **Windows:** `set GROQ_API_KEY=gsk_your_api_key_here`
   - **Mac/Linux:** `export GROQ_API_KEY=gsk_your_api_key_here`
4. Run the simulation:
   ```bash
   python battery_agent.py
   ```

---
*Built dynamically and fully agentically.*
