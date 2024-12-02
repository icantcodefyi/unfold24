# Smart Contract Generator API

An autonomous AI-driven platform to create, compile, and analyze Solidity smart contracts. This application provides a robust FastAPI-based backend for generating smart contracts, analyzing their security, and managing compilation processes with the aid of advanced LLMs (Language Learning Models).

---

## Features

- **Smart Contract Generation**: Automatically generate Solidity contracts from user prompts.
- **AI-Powered Analysis**: Uses LLMs to interpret vague or incomplete user requirements.
- **Security Assessment**: Identifies vulnerabilities and suggests fixes.
- **Dynamic Compilation**: Compiles contracts with on-the-fly resolution of Solidity version issues.
- **Streaming Feedback**: Real-time updates during contract generation and analysis.
- **Blockchain Integration**: Supports contract verification on blockchain networks.

---

## Installation

### Prerequisites

- Python 3.8+
- Node.js (optional for front-end interactions)
- Solidity Compiler (`solc`)
- Required Python libraries listed in `requirements.txt`

### Steps

1. Clone the repository:
   ```bash
   git clone <repository_url>
   cd <repository_directory>
   ```

2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows, use venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Install the Solidity compiler version `0.8.20` if not already installed:
   ```bash
   python -c "from solcx import install_solc; install_solc('0.8.20')"
   ```

5. Create a `.env` file and define the following environment variables:
   ```env
   OPENAI_API_KEY=your_openai_api_key
   ```

6. Start the application:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

---

## Usage

### Endpoints

#### Health Check
- **Endpoint**: `/health`
- **Method**: `GET`
- **Description**: Verifies if the service is running correctly.

#### Generate Contract
- **Endpoint**: `/generate-contract`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "prompt": "Describe the smart contract requirements here."
  }
  ```
- **Description**: Generates a complete Solidity contract from the given requirements.

#### Verify Contract
- **Endpoint**: `/verify-contract`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "contract_address": "0xYourContractAddress",
    "abi": [ ... ] // Provide the contract ABI
  }
  ```
- **Description**: Verifies a deployed contract on the blockchain, analyzing its functions and events.

---

## How It Works

1. **Prompt Parsing**:
   - Converts user-provided requirements into structured contract specifications.

2. **Contract Generation**:
   - AI develops a Solidity contract adhering to specified or inferred requirements.

3. **Compilation**:
   - Attempts to compile the generated contract. Automatically resolves missing compiler versions or adjusts versions if required.

4. **Security Analysis**:
   - Runs an AI-powered analysis to detect vulnerabilities and suggests remediation.

5. **Streaming Updates**:
   - Uses Server-Sent Events (SSE) for real-time feedback during each step of the process.

6. **Blockchain Verification**:
   - Analyzes contract deployment on a specified network, including function execution and event tracking.

---

## Dependencies

- **Frameworks**:
  - FastAPI: For REST API development.
  - Uvicorn: ASGI server for serving the FastAPI app.

- **AI Integration**:
  - OpenAI API: Powers the LLMs for contract generation and analysis.
  - LangChain: For prompt engineering and memory handling.

- **Blockchain Tools**:
  - Web3.py: Blockchain interaction.
  - Solidity Compiler (Solc): For contract compilation.

---

## Contribution

1. Fork the repository.
2. Create a feature branch:
   ```bash
   git checkout -b feature-name
   ```
3. Commit changes:
   ```bash
   git commit -m "Description of changes"
   ```
4. Push changes and create a pull request.

---

## License

This project is licensed under the MIT License.

---

## Acknowledgments

- **OpenAI** for providing cutting-edge LLM technology.
- **LangChain** for simplifying AI prompt management.
- **Solidity** for enabling blockchain-based smart contracts.
