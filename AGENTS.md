# Auto_Developer Agents & Skills

This project utilizes the **BMad Framework** alongside the **Antigravity Kit** to orchestrate structured, autonomous AI development.

## The `.agent` Directory Structure
The `.agent` directory acts as the core intelligence hub for this workspace, housing two distinct but complementary frameworks:

1. **Antigravity Skills (`.agent/skills/`)**: A Progressive Disclosure framework. It provides packages of specialized knowledge (guidelines, best practices, standards) that remain dormant until your specific request matches the skill's description. This prevents context-bloat while ensuring the AI knows your project's precise conventions.
2. **BMad Framework Agents (`.agent/workflows/`)**: Specialized, autonomous personas that drive different phases of the software development lifecycle. 

---

## BMad Framework Agents
The following agents are installed and available for explicit invocation via Gemini CLI slash commands (e.g., `/analyst`, `/dev`).

## Core Agents
- **bmad-master** (`/bmad-master`): The master orchestrator for the BMad method.

## BMM (BMad Management Method) Agents
- **analyst** (`/analyst`): Requirements, systems, and data analyst.
- **architect** (`/architect`): Technical architect and solution designer.
- **dev** (`/dev`): Core developer for implementing application functionality.
- **pm** (`/pm`): Product and project management.
- **qa** (`/qa`): Quality assurance and testing specialist.
- **sm** (`/sm`): Scrum master and process facilitator.
- **ux-designer** (`/ux-designer`): User experience and interface designer.
- **tech-writer** (`/tech-writer`): Technical writing and documentation.
- **quick-flow-solo-dev** (`/quick-flow-solo-dev`): Streamlined single-developer process for rapid tasks.

## CIS (Creative Innovation Suite) Agents
- **brainstorming-coach** (`/brainstorming-coach`): Facilitates idea generation and structured brainstorming.
- **creative-problem-solver** (`/creative-problem-solver`): Applies lateral thinking to complex challenges.
- **design-thinking-coach** (`/design-thinking-coach`): Guides empathy-driven, human-centered design.
- **innovation-strategist** (`/innovation-strategist`): Architects business model innovation and disruption.
- **presentation-master** (`/presentation-master`): Crafts compelling presentations and visual storytelling.
- **storyteller** (`/storyteller`): Develops narratives and communication strategies.

## TEA (Test Engineering & Automation) Agents
- **tea** (`/tea`): Specialized orchestrator for test engineering and automation.

_See the `.agent/workflows/` and `.gemini/commands/` directories for full agent and command configuration definitions._
