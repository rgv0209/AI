import os
import sys

# Try importing required libraries, guiding the user to install if missing.
try:
    from langchain_groq import ChatGroq
    from langchain.agents import Tool, initialize_agent, AgentType
    from langchain.memory import ConversationBufferMemory
except ImportError:
    print("Missing required libraries. Please install them using:")
    print("pip install langchain langchain-groq langchain-community")
    sys.exit(1)

# Ensure the Groq API key is set in the environment variables
if "GROQ_API_KEY" not in os.environ:
    print("\n[!] ERROR: GROQ_API_KEY environment variable not found.")
    print("Please set it in your terminal before running this script.")
    print("Windows: set GROQ_API_KEY=your_api_key")
    print("Mac/Linux: export GROQ_API_KEY=your_api_key\n")
    sys.exit(1)


def battery_predict(input_str: str) -> str:
    """
    Calculates estimated remaining battery time based on given percentage and drain rate.
    input_str should be a string containing 'battery_percentage, drain_rate'
    """
    try:
        # Parse inputs gracefully
        parts = input_str.split(',')
        if len(parts) != 2:
            return "Error: Please provide input exactly in the format 'battery_percentage, drain_rate' (e.g., '80, 10')."
        
        battery_pct = float(parts[0].strip())
        drain_rate = float(parts[-1].strip())
        
        if drain_rate <= 0:
            return "Error: Drain rate must be greater than 0."
        
        # Core Formula
        remaining_time = battery_pct / drain_rate
        
        response = (
            f"\n📊 **Calculation Result** 📊\n"
            f"Current Battery: {battery_pct}%\n"
            f"Drain Rate: {drain_rate}% per hour\n"
            f"➡️ Estimated Remaining Time: {remaining_time:.2f} hours\n\n"
            f"💡 **Battery-Saving Suggestions:**\n"
            f"1. Reduce screen brightness and enable dark mode.\n"
            f"2. Close unused background applications.\n"
            f"3. Disable unnecessary background processes and sync settings."
        )
        return response
    except Exception as e:
        return f"Error computing battery stats: {str(e)}"


def main():
    print("Initializing Groq LLM and LangChain Agent...")
    
    # 1. Initialize Groq LLM
    llm = ChatGroq(
        temperature=0.7,
        groq_api_key=os.environ.get("GROQ_API_KEY"),
        model_name="llama3-8b-8192"
    )

    # 2. Define the LangChain Tool
    battery_tool = Tool(
        name="battery_predict",
        func=battery_predict,
        description="Useful for calculating remaining battery time. Input MUST be a comma-separated string like '80, 10' where 80 is current battery and 10 is drain rate."
    )
    tools = [battery_tool]

    # 3. Setup Memory
    memory = ConversationBufferMemory(memory_key="chat_history")

    # 4. Initialize Agent
    agent = initialize_agent(
        tools=tools,
        llm=llm,
        agent=AgentType.CONVERSATIONAL_REACT_DESCRIPTION,
        verbose=False,
        memory=memory,
        handle_parsing_errors=True
    )

    print("\n" + "="*50)
    print("🔋 AI Battery Usage Predictor Enabled!")
    print("Type 'exit' or 'quit' to stop.")
    print("="*50 + "\n")

    # 5. Interactive Loop
    while True:
        try:
            print("-" * 50)
            battery_input = input("Enter current battery percentage (%): ").strip()
            if battery_input.lower() in ['exit', 'quit', 'q']:
                break
                
            drain_input = input("Enter battery drain rate (% per hour): ").strip()
            if drain_input.lower() in ['exit', 'quit', 'q']:
                break
            
            print("\n🤖 AI is thinking...\n")
            
            # Formatting prompt for the agent
            user_prompt = (
                f"Run AI Simulation Sequence on the following real-time telemetry: SoC Capacity {battery_input}%, Discharge Velocity {drain_input}%/hr. "
                "DO NOT give basic advice like 'turn down brightness'. Use the battery_predict tool to calculate the raw time, then output a highly technical 'Predictive AI Diagnostic Report'. "
                "Use advanced forensic engineering terminology. Structure your response into exactly three sections: 1) [AI Context Analysis] 2) [Hardware Anomaly Detection] 3) [Advanced Kernel/OS Mitigations]. "
                "Include hypothetical confidence percentages, theorize on thermal decay vectors (CPU/GPU), and give highly advanced mitigations."
            )
            
            # Execute agent
            result = agent.run(user_prompt)
            print(f"🗨️  AI Response:\n{result}\n")
            
        except KeyboardInterrupt:
            print("\nExiting program...")
            break
        except Exception as e:
            print(f"\nAn error occurred: {e}\n")

if __name__ == "__main__":
    main()
