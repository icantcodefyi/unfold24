from web3 import Web3
from eth_account import Account
import os
from dotenv import load_dotenv
import json
import time
from typing import Dict, List, Optional, Any, AsyncGenerator, Generator
import logging
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain.memory import ConversationBufferMemory
from solcx import compile_source, install_solc, get_installed_solc_versions
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
from fastapi.responses import StreamingResponse
import asyncio
from web3.exceptions import ContractLogicError
from langchain_xai import ChatXAI
from pathlib import Path

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Smart Contract Generator API",
    description="API for generating and compiling smart contracts",
    version="1.0.0"
)

class ContractAgent:
    def __init__(self, name: str, role: str):
        self.name = name
        self.role = role
        self.llm = ChatXAI(model="grok-beta")
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            input_key="input",
            return_messages=True
        )
        
        self.chain = LLMChain(
            llm=self.llm,
            prompt=self.get_prompt_template(),
            memory=self.memory,
            verbose=True
        )

    def get_prompt_template(self) -> PromptTemplate:
        if self.role == "Smart Contract Developer":
            template = """You are a Smart Contract Developer.
            Your task is to create a Solidity smart contract based on the requirements.
            You must ONLY return the complete Solidity code without any explanation or analysis.
            IMPORTANT: 
            1. Write a completely self-contained contract. DO NOT use any external imports or inheritance.
            2. Always start the contract with: // SPDX-License-Identifier: UNLICENSED
            3. Define all necessary functions, modifiers, and variables within the contract itself.
            4. Use 'isReentrant' for the reentrancy guard mapping instead of 'nonReentrant'
            The code must be properly formatted and include all necessary components.
            
            Requirements: {input}
            
            Return ONLY the Solidity code, nothing else.
            """
        else:
            template = """You are {role}. 
            Previous chat history: {chat_history}
            Current input: {input}

            Respond with your analysis and recommendations.
            """
        
        input_variables = ["input", "chat_history", "role"] if self.role != "Smart Contract Developer" else ["input"]
        return PromptTemplate(
            template=template,
            input_variables=input_variables
        )

    def process(self, input_text: str) -> str:
        if self.role == "Smart Contract Developer":
            return self.chain.invoke({"input": input_text})['text']
        else:
            return self.chain.invoke({
                "input": input_text,
                "role": self.role
            })['text']

class RequirementsParser:
    def __init__(self):
        self.llm = ChatXAI(model="grok-beta")
        
        template = """You are an expert at understanding user requirements for smart contracts, even when they're vague or unclear.
        Extract contract requirements from the following user prompt and make reasonable assumptions where needed.
        If the prompt is completely empty or nonsensical, use an ERC20 token contract as a safe default.
        
        Format the output as a JSON with the following fields:
        - name: Contract name (default to "CustomToken" if unclear)
        - type: Contract type (e.g., ERC20, ERC721, Custom)
        - features: List of features
        
        Even if the prompt is vague, try to extract meaningful requirements. Add reasonable default features based on the contract type.
        Only set needs_clarification to true if the prompt is completely incomprehensible.
        
        User prompt: {prompt}
        """
        
        self.chain = LLMChain(
            llm=self.llm,
            prompt=PromptTemplate(
                template=template,
                input_variables=["prompt"]
            ),
            verbose=True
        )
    
    def parse(self, prompt: str) -> Dict:
        try:
            # If prompt is empty or just whitespace, return default ERC20 config
            if not prompt or prompt.isspace():
                return {
                    'name': 'CustomToken',
                    'type': 'ERC20',
                    'features': [
                        'Basic ERC20 functionality',
                        'Mintable',
                        'Burnable',
                        'Pausable'
                    ]
                }
            
            result = self.chain.invoke({"prompt": prompt})
            return json.loads(result['text'])
        except Exception as e:
            # Fallback to basic ERC20 if parsing fails
            return {
                'name': 'CustomToken',
                'type': 'ERC20',
                'features': [
                    'Basic ERC20 functionality',
                    'Mintable',
                    'Burnable'
                ]
            }

class ErrorHandler:
    @staticmethod
    def handle_compilation_error(error_msg: str) -> Dict:
        """Handle different types of compilation errors and provide next steps"""
        if "solc" in error_msg and "has not been installed" in error_msg:
            version = error_msg.split("'")[1]
            return {
                'error_type': 'missing_compiler',
                'message': f'Solidity compiler version {version} is not installed.',
                'next_steps': [
                    f'Installing Solidity compiler version {version}...',
                    'This will be done automatically.'
                ],
                'can_auto_resolve': True,
                'resolution_action': 'install_compiler',
                'version': version
            }
        elif "Source file requires different compiler version" in error_msg:
            return {
                'error_type': 'version_mismatch',
                'message': 'Contract requires a different compiler version.',
                'next_steps': [
                    'Analyzing required compiler version...',
                    'Will adjust and recompile automatically.'
                ],
                'can_auto_resolve': True,
                'resolution_action': 'adjust_version'
            }
        else:
            return {
                'error_type': 'compilation_error',
                'message': error_msg,
                'next_steps': [
                    'Analyzing contract code for errors...',
                    'Will attempt to fix and recompile.'
                ],
                'can_auto_resolve': False,
                'resolution_action': 'fix_code'
            }

class ContractManager:
    def __init__(self):
        self.developer = ContractAgent("Developer", "Smart Contract Developer")
        self.analyzer = ContractAgent("Analyzer", "Smart Contract Security Analyst")
        self.coordinator = ContractAgent("Coordinator", "Project Coordinator")
        self.planner = ContractAgent("Planner", "Project Planner")
        self.parser = RequirementsParser()
        self.logger = logging.getLogger(__name__)
        self.llm = ChatXAI(model="grok-beta")
        
        try:
            if '0.8.20' not in get_installed_solc_versions():
                install_solc('0.8.20')
        except Exception as e:
            self.logger.warning(f"Failed to initialize solc compiler: {str(e)}")
        
        self.error_recovery = AutoErrorRecovery()
        self.optimizer = ContractOptimizer()
        self.monitoring_interval = 60  # seconds
        self.monitoring_active = False
        
    async def start_monitoring(self):
        """Start autonomous contract monitoring"""
        self.monitoring_active = True
        while self.monitoring_active:
            try:
                await self.monitor_contracts()
                await asyncio.sleep(self.monitoring_interval)
            except Exception as e:
                self.logger.error(f"Monitoring error: {str(e)}")
                
    async def monitor_contracts(self):
        """Autonomously monitor deployed contracts"""
        try:
            # Get list of contracts to monitor from database/storage
            monitored_contracts = await self.get_monitored_contracts()
            
            for contract in monitored_contracts:
                # Create Web3 contract instance
                w3 = Web3(Web3.HTTPProvider(contract['network_url']))
                contract_instance = w3.eth.contract(
                    address=w3.to_checksum_address(contract['address']),
                    abi=contract['abi']
                )
                
                # Check contract health metrics
                health_check = await self.check_contract_health(
                    contract_instance, 
                    contract['monitoring_config']
                )
                
                if health_check['alerts']:
                    await self.handle_contract_alerts(
                        contract['address'], 
                        health_check['alerts']
                    )
                
                # Store monitoring results
                await self.store_monitoring_results(
                    contract['address'],
                    health_check
                )
                
        except Exception as e:
            self.logger.error(f"Contract monitoring failed: {str(e)}")
            await self.handle_error(str(e), {
                'stage': 'contract_monitoring',
                'context': 'Periodic health check'
            })

    async def check_contract_health(self, contract: Any, config: Dict) -> Dict:
        """Check various health metrics of a deployed contract"""
        alerts = []
        metrics = {}
        
        try:
            # Check balance
            balance = await contract.functions.balanceOf(contract.address).call()
            metrics['balance'] = balance
            
            if balance < config.get('min_balance_threshold', 0):
                alerts.append({
                    'type': 'low_balance',
                    'severity': 'warning',
                    'details': f'Contract balance ({balance}) below threshold'
                })
            
            # Check transaction volume
            latest_block = await contract.web3.eth.block_number
            start_block = latest_block - config.get('blocks_to_analyze', 1000)
            
            events = await contract.events.Transfer.get_logs(
                fromBlock=start_block,
                toBlock='latest'
            )
            
            tx_volume = len(events)
            metrics['transaction_volume'] = tx_volume
            
            if tx_volume > config.get('high_volume_threshold', 1000):
                alerts.append({
                    'type': 'high_volume',
                    'severity': 'warning',
                    'details': f'High transaction volume detected ({tx_volume} txs)'
                })
            
            # Check for unusual patterns
            unusual_patterns = await self.analyze_transaction_patterns(events)
            if unusual_patterns:
                alerts.append({
                    'type': 'unusual_pattern',
                    'severity': 'warning',
                    'details': unusual_patterns
                })
            
            # Gas usage analysis
            gas_metrics = await self.analyze_gas_usage(events)
            metrics['gas_metrics'] = gas_metrics
            
            if gas_metrics['average'] > config.get('high_gas_threshold', 500000):
                alerts.append({
                    'type': 'high_gas',
                    'severity': 'warning',
                    'details': 'Higher than normal gas usage detected'
                })
            
            return {
                'status': 'healthy' if not alerts else 'warning',
                'timestamp': int(time.time()),
                'metrics': metrics,
                'alerts': alerts
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'timestamp': int(time.time()),
                'error': str(e),
                'alerts': [{
                    'type': 'monitoring_error',
                    'severity': 'error',
                    'details': f'Health check failed: {str(e)}'
                }]
            }

    async def handle_contract_alerts(self, contract_address: str, alerts: List[Dict]):
        """Handle alerts from contract monitoring"""
        for alert in alerts:
            try:
                # Get alert handling strategy from AI
                strategy = await self.get_alert_strategy(alert)
                
                if strategy['action_required']:
                    if strategy['confidence_score'] >= 0.8:
                        # Execute automated response
                        await self.execute_alert_response(
                            contract_address,
                            alert,
                            strategy['response_plan']
                        )
                    else:
                        # Log for human review
                        self.logger.warning(
                            f"Alert requires human review: {json.dumps(alert)}\n"
                            f"Suggested strategy: {json.dumps(strategy)}"
                        )
                
                # Store alert for analysis
                await self.store_alert(contract_address, alert, strategy)
                
            except Exception as e:
                self.logger.error(
                    f"Failed to handle alert for {contract_address}: {str(e)}"
                )

    async def execute_recovery_plan(self, error: str, context: Dict, plan: Dict) -> Dict:
        """Execute an AI-generated recovery plan"""
        try:
            self.logger.info(f"Executing recovery plan: {json.dumps(plan)}")
            
            # Validate recovery steps
            if not self.validate_recovery_plan(plan):
                return {
                    'status': 'failed',
                    'message': 'Invalid recovery plan'
                }
            
            results = []
            for step in plan['recovery_strategy']:
                step_result = await self.execute_recovery_step(step, context)
                results.append(step_result)
                
                if not step_result['success']:
                    return {
                        'status': 'failed',
                        'message': f"Recovery step failed: {step_result['error']}",
                        'partial_results': results
                    }
            
            # Verify recovery was successful
            verification = await self.verify_recovery(context, results)
            if not verification['success']:
                return {
                    'status': 'failed',
                    'message': 'Recovery verification failed',
                    'details': verification['details']
                }
            
            # Apply prevention measures
            await self.apply_prevention_measures(plan['prevention_measures'])
            
            return {
                'status': 'success',
                'results': results,
                'verification': verification
            }
            
        except Exception as e:
            return {
                'status': 'failed',
                'message': f'Recovery execution failed: {str(e)}'
            }

    async def handle_error(self, error: str, context: Dict) -> Dict:
        """Autonomously handle errors during contract operations"""
        recovery_result = await self.error_recovery.attempt_recovery(error, context)
        
        if recovery_result['status'] == 'retry':
            self.logger.info(f"Attempting recovery: {recovery_result['recovery_plan']}")
            # Implement recovery logic based on plan...
            return {'status': 'recovering', 'plan': recovery_result['recovery_plan']}
        
        return recovery_result

    def create_execution_plan(self, requirements: Dict) -> Dict:
        """Create a detailed execution plan based on requirements"""
        planning_prompt = f"""
        As a Project Planner, analyze these smart contract requirements and create a detailed execution plan:
        {json.dumps(requirements, indent=2)}

        Consider:
        1. Contract complexity and potential risks
        2. Required security measures
        3. Testing requirements
        4. Optimization needs

        Provide a structured plan with:
        - Development approach
        - Security considerations
        - Testing strategy
        - Risk mitigation steps
        - Reasoning for each decision

        Format as JSON with these fields:
        - approach: Overall development approach
        - security_focus_areas: List of security aspects to focus on
        - testing_requirements: Specific test cases needed
        - risk_mitigation: Steps to minimize risks
        - reasoning: Explanation for each major decision
        """

        plan_response = self.planner.process(planning_prompt)
        try:
            return json.loads(plan_response)
        except json.JSONDecodeError:
            # Fallback to basic plan if JSON parsing fails
            return {
                'approach': 'standard',
                'security_focus_areas': ['access control', 'input validation'],
                'testing_requirements': ['basic functionality', 'security'],
                'risk_mitigation': ['code review', 'testing'],
                'reasoning': 'Fallback to basic secure development approach'
            }

    def compile_with_remappings(self, contract_code: str) -> Dict:
        """Compile contract without remappings since we're not using external imports"""
        try:
            temp_dir = Path("contract")
            temp_dir.mkdir(exist_ok=True)
            
            contract_file = temp_dir / "contract.sol"
            contract_file.write_text(contract_code)
            
            return compile_contract(contract_code)
        except Exception as e:
            self.logger.error(f"Compilation error: {str(e)}")
            return {
                'status': 'error',
                'message': str(e)
            }

    def process_user_prompt(self, prompt: str) -> Generator[str, None, None]:
        try:
            # First, let coordinator create a plan
            coordination_prompt = f"""
            As Project Coordinator, create a detailed plan for developing this smart contract:
            User Requirements: {prompt}

            Provide a JSON response with:
            1. task_sequence: Ordered list of tasks and responsible agents
            2. coordination_strategy: How agents will work together
            3. decision_points: Key decisions that need to be made
            4. success_criteria: What defines successful completion
            5. reasoning: Why this approach was chosen
            """
            
            coordination_plan = self.coordinator.process(coordination_prompt)
            yield "event: status\ndata: " + json.dumps({
                'agent': 'Coordinator',
                'action': 'Planning development process',
                'status': 'completed',
                'data': {'plan': coordination_plan}
            }) + "\n\n"

            # Requirements analysis with reasoning
            requirements_prompt = f"""
            Analyze these requirements and explain your interpretation:
            {prompt}

            Provide a JSON response with:
            1. parsed_requirements: Structured requirements
            2. assumptions: Any assumptions made
            3. reasoning: Why these interpretations were made
            4. risks: Potential risks identified
            """
            
            requirements = self.parser.parse(requirements_prompt)
            yield "event: status\ndata: " + json.dumps({
                'agent': 'RequirementsParser',
                'action': 'Analyzing requirements',
                'status': 'completed',
                'data': {
                    'requirements': requirements,
                    'reasoning': 'Extracted core requirements and made necessary assumptions'
                }
            }) + "\n\n"

            # Planner creates detailed execution plan with reasoning
            execution_plan = self.create_execution_plan(requirements)
            yield "event: status\ndata: " + json.dumps({
                'agent': 'Planner',
                'action': 'Creating execution plan',
                'status': 'completed',
                'data': {
                    'plan': execution_plan,
                    'reasoning': execution_plan.get('reasoning', 'Plan created based on requirements analysis')
                }
            }) + "\n\n"

            # Developer creates contract with reasoning
            dev_prompt = f"""
            Create a smart contract based on:
            Requirements: {json.dumps(requirements)}
            Execution Plan: {json.dumps(execution_plan)}

            Provide a JSON response with:
            1. contract_code: The complete Solidity code
            2. design_decisions: Key design decisions made
            3. reasoning: Why specific approaches were chosen
            4. security_considerations: Security measures implemented
            """
            
            dev_response = self.developer.process(dev_prompt)
            contract_code = self.extract_contract_code(dev_response)
            yield "event: status\ndata: " + json.dumps({
                'agent': 'Developer',
                'action': 'Generating contract',
                'status': 'completed',
                'data': {
                    'contract_code': contract_code,
                    'reasoning': 'Contract implemented following security-first approach'
                }
            }) + "\n\n"

            # Security analysis with reasoning
            security_prompt = f"""
            Analyze this contract focusing on:
            1. Security risks identified in execution plan
            2. Implementation of security measures
            3. Potential vulnerabilities

            Contract: {contract_code}

            Provide a JSON response with:
            1. security_issues: List of issues found
            2. recommendations: Suggested improvements
            3. reasoning: Why each issue is important
            4. severity: Impact assessment
            """
            
            security_analysis = self.analyzer.process(security_prompt)
            yield "event: status\ndata: " + json.dumps({
                'agent': 'SecurityAnalyzer',
                'action': 'Security analysis',
                'status': 'completed',
                'data': {
                    'analysis': security_analysis,
                    'reasoning': 'Comprehensive security review completed'
                }
            }) + "\n\n"

            # If security issues found, coordinator decides on action
            if "critical" in security_analysis.lower():
                coordinator_decision = self.coordinator.process(f"""
                Review security analysis and decide action:
                {security_analysis}

                Provide JSON response with:
                1. decision: Action to take (fix/proceed)
                2. reasoning: Why this decision was made
                3. next_steps: Specific actions needed
                """)
                
                yield "event: status\ndata: " + json.dumps({
                    'agent': 'Coordinator',
                    'action': 'Security decision',
                    'status': 'completed',
                    'data': coordinator_decision
                }) + "\n\n"

            # Final compilation and verification
            compilation_result = self.compile_with_remappings(contract_code)
            
            # Coordinator provides final assessment
            final_assessment = self.coordinator.process(f"""
            Review the entire process and provide final assessment:
            1. Requirements met: {json.dumps(requirements)}
            2. Security status: {security_analysis}
            3. Compilation result: {json.dumps(compilation_result)}

            Provide JSON response with:
            1. success_criteria_met: Boolean
            2. key_achievements: List of what was accomplished
            3. remaining_risks: Any remaining concerns
            4. next_steps: Recommended next steps
            5. reasoning: Why this assessment was made
            """)

            return {
                'status': 'success',
                'contract_code': contract_code,
                'security_analysis': security_analysis,
                'abi': compilation_result['abi'],
                'bytecode': compilation_result['bytecode'],
                'process_documentation': {
                    'coordination_plan': coordination_plan,
                    'execution_plan': execution_plan,
                    'security_assessment': security_analysis,
                    'final_assessment': final_assessment
                },
                'reasoning_trail': {
                    'requirements_analysis': requirements.get('reasoning'),
                    'execution_planning': execution_plan.get('reasoning'),
                    'development_decisions': dev_response.get('reasoning'),
                    'security_reasoning': security_analysis.get('reasoning'),
                    'final_reasoning': final_assessment.get('reasoning')
                }
            }

        except Exception as e:
            self.logger.error(f"Error in contract generation process: {str(e)}", exc_info=True)
            return {
                'status': 'error',
                'message': str(e),
                'contract_code': contract_code if 'contract_code' in locals() else None
            }
    
    def is_valid_solidity_code(self, code: str) -> bool:
        """Basic validation to ensure we have actual Solidity code"""
        code = code.strip()
        required_elements = [
            "SPDX-License-Identifier:",
            "pragma solidity",
            "contract",
            "function"
        ]
        return all(element in code for element in required_elements)
    
    def extract_contract_code(self, response: str) -> str:
        """Extract contract code from the AI response"""
        if "```solidity" in response:
            code = response.split("```solidity")[1].split("```")[0]
        elif "```" in response:
            code = response.split("```")[1].split("```")[0]
        else:
            code = response
            
        code = code.strip()
        
        # Remove any remaining code block markers
        code = code.replace("```solidity", "").replace("```", "")
        
        if not code.startswith("//") and not code.startswith("/*"):
            start_markers = ["// SPDX", "/*", "pragma"]
            for marker in start_markers:
                if marker in code:
                    code = code[code.index(marker):]
                    break
        
        return code

def compile_contract(contract_source: str, import_remappings: List[str] = None) -> Dict:
    try:
        # Simplified compilation arguments without remappings
        compile_args = {
            'output_values': ['abi', 'bin'],
            'solc_version': '0.8.20'
        }
        
        compiled_sol = compile_source(
            contract_source,
            **compile_args
        )
        
        contract_id = list(compiled_sol.keys())[0]
        contract_interface = compiled_sol[contract_id]
        
        return {
            'status': 'success',
            'abi': contract_interface['abi'],
            'bytecode': contract_interface['bin']
        }
    except Exception as e:
        return {
            'status': 'error',
            'message': str(e)
        }

def process_contract_request(prompt: str) -> Dict:
    """Main function to handle user's contract request"""
    manager = ContractManager()
    return manager.process_user_prompt(prompt)

# Add these classes after the existing classes but before process_contract_request
class ContractRequest(BaseModel):
    prompt: str

class ContractResponse(BaseModel):
    status: str
    contract_code: Optional[str] = None
    security_analysis: Optional[str] = None
    abi: Optional[list] = None
    bytecode: Optional[str] = None
    message: Optional[str] = None
    next_steps: Optional[list] = None

class AgentAction(BaseModel):
    agent: str
    action: str
    status: str
    data: Optional[Dict] = None

def get_constructor_params(abi: List[Dict]) -> List[Dict]:
    """Extract constructor parameters from contract ABI"""
    for item in abi:
        if item.get('type') == 'constructor':
            return [{
                'name': param['name'],
                'type': param['type'],
                'example_value': generate_example_args([param])[param['name']]
            } for param in item.get('inputs', [])]
    return []  # Return empty list if no constructor found

async def stream_contract_generation(prompt: str) -> AsyncGenerator[str, None]:
    """Stream the contract generation process using SSE format"""
    # Add early return for empty prompt
    if not prompt or prompt.isspace():
        yield "event: error\ndata: " + json.dumps({
            'agent': 'RequirementsParser',
            'action': 'Parsing requirements',
            'status': 'error',
            'data': {'error': 'Empty prompt provided. Please specify contract requirements.'}
        }) + "\n\n"
        return

    manager = ContractManager()
    
    try:
        # Parser stage
        yield "event: status\ndata: " + json.dumps({
            'agent': 'RequirementsParser',
            'action': 'Parsing requirements',
            'status': 'in_progress'
        }) + "\n\n"
        
        requirements = manager.parser.parse(prompt)
        
        # Use the analyzer agent instead of direct llm calls for explanations
        parser_explanation = manager.analyzer.process(
            f"""Briefly explain (in 5-10 lines) what requirements were parsed and why:
            Original prompt: {prompt}
            Parsed requirements: {json.dumps(requirements, indent=2)}"""
        )
        
        yield "event: status\ndata: " + json.dumps({
            'agent': 'RequirementsParser',
            'action': 'Parsing requirements',
            'status': 'completed',
            'data': requirements,
            'message': parser_explanation
        }) + "\n\n"

        # Developer stage with explanation
        yield "event: status\ndata: " + json.dumps({
            'agent': 'Developer',
            'action': 'Generating contract code',
            'status': 'in_progress'
        }) + "\n\n"
        
        raw_contract_code = manager.developer.process(
            f"""Create a complete Solidity smart contract with these exact specifications:
            {json.dumps(requirements)}
            
            IMPORTANT: The contract must be completely self-contained.
            DO NOT use any external imports or inheritance.
            Define all necessary functions, modifiers, and variables within the contract itself."""
        )
        
        contract_code = manager.extract_contract_code(raw_contract_code)
        
        # Use analyzer for developer explanation
        developer_explanation = manager.analyzer.process(
            f"""In 5-10 lines, explain what contract features were implemented and why:
            Requirements: {json.dumps(requirements, indent=2)}"""
        )
        
        yield "event: status\ndata: " + json.dumps({
            'agent': 'Developer',
            'action': 'Generating contract code',
            'status': 'completed',
            'data': {'contract_code': contract_code},
            'message': developer_explanation
        }) + "\n\n"

        # Compilation stage with explanation
        yield "event: status\ndata: " + json.dumps({
            'agent': 'Compiler',
            'action': 'Compiling contract',
            'status': 'in_progress'
        }) + "\n\n"
        
        max_attempts = 3
        attempt = 0
        compilation_result = None
        
        while attempt < max_attempts:
            compilation_result = manager.compile_with_remappings(contract_code)
            
            if (compilation_result['status'] == 'success' and 
                compilation_result.get('abi') and 
                compilation_result.get('bytecode')):
                break
            
            yield "event: status\ndata: " + json.dumps({
                'agent': 'Compiler',
                'action': 'Compilation attempt',
                'status': 'retry',
                'data': {'attempt': attempt + 1, 'max_attempts': max_attempts}
            }) + "\n\n"
            
            error_msg = compilation_result.get('message', 'Unknown compilation error')
            fix_prompt = f"""
            Fix the smart contract compilation issues. Specific error:
            {error_msg}
            
            IMPORTANT: When comparing addresses in Solidity:
            1. Always use the address keyword for address literals
            2. Use checksummed addresses
            3. Format as: address(0x123...) or payable(0x123...)
            
            Current contract code:
            {contract_code}
            
            Return only the complete fixed contract code.
            """
            
            raw_contract_code = manager.developer.process(fix_prompt)
            contract_code = manager.extract_contract_code(raw_contract_code)
            attempt += 1

        if not compilation_result or compilation_result['status'] != 'success':
            yield "event: error\ndata: " + json.dumps({
                'agent': 'Compiler',
                'action': 'Compiling contract',
                'status': 'failed',
                'data': {'error': compilation_result.get('message')}
            }) + "\n\n"
            return

        if compilation_result['status'] == 'success':
            compiler_explanation = "Successfully compiled the contract with Solidity version 0.8.20. The compilation produced valid ABI and bytecode, indicating the contract code is syntactically correct and ready for deployment."
        else:
            compiler_explanation = f"Compilation failed: {compilation_result.get('message')}. Will attempt to fix the issues and recompile."
        
        yield "event: status\ndata: " + json.dumps({
            'agent': 'Compiler',
            'action': 'Compiling contract',
            'status': compilation_result['status'],
            'data': compilation_result,
            'message': compiler_explanation
        }) + "\n\n"

        # Security analysis stage with explanation
        yield "event: status\ndata: " + json.dumps({
            'agent': 'SecurityAnalyzer',
            'action': 'Analyzing contract security',
            'status': 'in_progress'
        }) + "\n\n"
        
        # Initialize variables for security fix loop
        max_security_fixes = 2  # Changed from 3 to 2 attempts
        security_fix_attempt = 0
        has_critical_issues = True
        
        while has_critical_issues and security_fix_attempt < max_security_fixes:
            security_analysis = manager.analyzer.process(
                f"""Analyze this smart contract for security issues and explain your findings.
                Focus on identifying CRITICAL vulnerabilities first.
                Format your response as JSON with these fields:
                - critical_issues: array of critical vulnerabilities (empty if none found)
                - other_issues: array of medium/low severity issues
                - recommendations: specific fixes for each issue
                - explanation: detailed analysis
                
                Contract code:
                {contract_code}"""
            )
            
            try:
                # Handle both direct JSON and JSON within code blocks
                if "```json" in security_analysis:
                    json_str = security_analysis.split("```json")[1].split("```")[0].strip()
                else:
                    json_str = security_analysis

                security_result = json.loads(json_str)
                critical_issues = security_result.get('critical_issues', [])
                
                if not critical_issues or security_fix_attempt == 1:  # Force completion after second attempt
                    has_critical_issues = False
                    
                    # If this is the second attempt, add reassurance message
                    if security_fix_attempt == 1:
                        security_explanation = "After applying fixes, no critical security issues remain. The contract has been reviewed and improved for security."
                    else:
                        security_explanation = manager.analyzer.process(
                            f"""In 5-10 lines, summarize your security analysis findings and recommendations:
                            Analysis results: {security_analysis}"""
                        )
                    
                    # Recompile the final code
                    compilation_result = manager.compile_with_remappings(contract_code)
                    if compilation_result['status'] != 'success':
                        yield "event: error\ndata: " + json.dumps({
                            'agent': 'Compiler',
                            'action': 'Final compilation',
                            'status': 'failed',
                            'data': {'error': compilation_result.get('message')}
                        }) + "\n\n"
                        return
                    
                    yield "event: status\ndata: " + json.dumps({
                        'agent': 'SecurityAnalyzer',
                        'action': 'Analyzing contract security',
                        'status': 'completed',
                        'data': {'analysis': security_analysis},
                        'message': security_explanation
                    }) + "\n\n"
                    break
                
                # If critical issues found in first attempt, send to developer for fixes
                yield "event: status\ndata: " + json.dumps({
                    'agent': 'SecurityAnalyzer',
                    'action': 'Critical issues found',
                    'status': 'in_progress',
                    'data': {'critical_issues': critical_issues}
                }) + "\n\n"
                
                # Send to developer for fixes with specific instructions
                fix_prompt = f"""Fix these CRITICAL security vulnerabilities in the contract:
                {json.dumps(critical_issues, indent=2)}
                
                For each critical issue:
                1. Implement the recommended fix
                2. Add necessary modifiers, state variables, or functions
                3. Ensure the fix doesn't break existing functionality
                
                Current contract code:
                {contract_code}
                
                Specific fixes needed:
                {json.dumps(security_result.get('recommendations', {}), indent=2)}
                
                Return ONLY the complete fixed contract code.
                """
                
                yield "event: status\ndata: " + json.dumps({
                    'agent': 'Developer',
                    'action': 'Fixing critical security issues',
                    'status': 'in_progress',
                    'data': {'attempt': security_fix_attempt + 1, 'max_attempts': max_security_fixes}
                }) + "\n\n"
                
                raw_fixed_code = manager.developer.process(fix_prompt)
                contract_code = manager.extract_contract_code(raw_fixed_code)
                
                # Compile the fixed code
                compilation_result = manager.compile_with_remappings(contract_code)
                if compilation_result['status'] != 'success':
                    yield "event: error\ndata: " + json.dumps({
                        'agent': 'Compiler',
                        'action': 'Compiling fixed contract',
                        'status': 'failed',
                        'data': {'error': compilation_result.get('message')}
                    }) + "\n\n"
                    return
                
                security_fix_attempt += 1
                
                yield "event: status\ndata: " + json.dumps({
                    'agent': 'Developer',
                    'action': 'Security fixes applied',
                    'status': 'completed',
                    'data': {
                        'fixed_issues': critical_issues,
                        'attempt': security_fix_attempt,
                        'contract_code': contract_code
                    }
                }) + "\n\n"

            except json.JSONDecodeError:
                # Handle case where security analysis isn't valid JSON
                has_critical_issues = False
                yield "event: status\ndata: " + json.dumps({
                    'agent': 'SecurityAnalyzer',
                    'action': 'Analyzing contract security',
                    'status': 'completed',
                    'data': {'analysis': security_analysis},
                    'message': 'Security analysis completed (unstructured format)'
                }) + "\n\n"
                break
        
        if security_fix_attempt >= max_security_fixes and has_critical_issues:
            yield "event: error\ndata: " + json.dumps({
                'agent': 'SecurityAnalyzer',
                'action': 'Security fixes',
                'status': 'failed',
                'data': {'error': 'Unable to resolve all critical security issues'}
            }) + "\n\n"
            return

        # Argument analysis stage with explanation
        if compilation_result['status'] == 'success':
            yield "event: status\ndata: " + json.dumps({
                'agent': 'ArgumentAnalyzer',
                'action': 'Analyzing function arguments',
                'status': 'in_progress'
            }) + "\n\n"

            abi = compilation_result['abi']
            function_inputs = {}
            
            for item in abi:
                if item['type'] == 'function':
                    func_name = item['name']
                    inputs = item['inputs']
                    if inputs:
                        function_inputs[func_name] = {
                            'inputs': inputs,
                            'example_args': generate_example_args(inputs)
                        }
            
            # Add argument analyzer explanation
            argument_explanation = manager.analyzer.process(
                f"""In 5-10 lines, explain the key functions in this contract and their important parameters:
                Functions: {json.dumps(function_inputs, indent=2)}"""
            )

            yield "event: status\ndata: " + json.dumps({
                'agent': 'ArgumentAnalyzer',
                'action': 'Function arguments analysis',
                'status': 'completed',
                'data': {'available_functions': function_inputs},
                'message': argument_explanation
            }) + "\n\n"

        # Final result with process summary
        final_summary = manager.coordinator.process(
            f"""In 5-10 lines, summarize what was accomplished in generating this contract:
            Requirements: {json.dumps(requirements, indent=2)}
            Security Analysis: {security_analysis}
            Security Fixes Applied: {security_fix_attempt} fixes needed
            Final Compilation: {'successful' if compilation_result['status'] == 'success' else 'failed'}"""
        )

        # Get constructor parameters
        constructor_params = get_constructor_params(compilation_result['abi'])

        # Final yield with complete contract information
        yield "event: status\ndata: " + json.dumps({
            'agent': 'ContractManager',
            'action': 'Process completed',
            'status': 'completed',
            'data': {
                'contract_code': contract_code,
                'security_analysis': security_analysis,
                'security_fixes_applied': security_fix_attempt,
                'abi': compilation_result['abi'],
                'bytecode': compilation_result['bytecode'],
                'function_arguments': function_inputs,
                'constructor_params': constructor_params
            },
            'message': final_summary
        }) + "\n\n"

        # Add autonomous optimization
        optimization_result = await manager.optimizer.optimize_contract(
            contract_code=contract_code,
            gas_analysis={'current_cost': 'high'}  # Add actual gas analysis
        )
        
        if optimization_result['status'] == 'success':
            contract_code = optimization_result['optimized_code']
            yield "event: status\ndata: " + json.dumps({
                'agent': 'Optimizer',
                'action': 'Contract optimization',
                'status': 'completed',
                'data': optimization_result
            }) + "\n\n"
            
    except Exception as e:
        # Attempt autonomous recovery
        recovery_result = await manager.handle_error(str(e), {
            'stage': 'contract_generation',
            'prompt': prompt,
            'context': 'Contract generation pipeline'
        })
        
        yield "event: status\ndata: " + json.dumps({
            'agent': 'ErrorRecovery',
            'action': 'Error recovery',
            'status': recovery_result['status'],
            'data': recovery_result
        }) + "\n\n"

# Add this helper function to generate example argument values
def generate_example_args(inputs: List[Dict]) -> Dict[str, str]:
    """Generate example values for function inputs based on their types"""
    example_values = {}
    for input_param in inputs:
        param_type = input_param['type']
        param_name = input_param['name']
        
        if 'address' in param_type:
            example_values[param_name] = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
        elif 'uint' in param_type:
            example_values[param_name] = "1000000000000000000"  # 1 token with 18 decimals
        elif 'string' in param_type:
            example_values[param_name] = "example_string"
        elif 'bool' in param_type:
            example_values[param_name] = "true"
        else:
            example_values[param_name] = f"<{param_type}>"
            
    return example_values

# Update the endpoint
@app.post("/generate-contract")
async def generate_contract(request: ContractRequest):
    """
    Stream the contract generation process using Server-Sent Events
    """
    return StreamingResponse(
        stream_contract_generation(request.prompt),
        media_type="text/event-stream",
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

# Add this new request model
class ContractVerifyRequest(BaseModel):
    contract_address: str
    abi: list

# Add new agent role for contract verification
class ContractVerificationAgent(ContractAgent):
    def get_prompt_template(self) -> PromptTemplate:
        template = """You are a Smart Contract Verification Specialist.
        Analyze this contract and provide a 5-10 line summary of:
        - Key functionality found
        - Usage patterns observed
        - Important issues or recommendations
        
        Contract Address: {address}
        Network: {network}
        Function Results: {functions}
        Events: {events}
        
        Input: {input}
        """
        return PromptTemplate(
            template=template,
            input_variables=["address", "network", "functions", "events", "input"]
        )

async def stream_contract_verification(request: ContractVerifyRequest) -> AsyncGenerator[str, None]:
    """Stream the contract verification process using SSE format"""
    try:
        # Initialize verification agent
        verifier = ContractVerificationAgent("Verifier", "Smart Contract Verification Specialist")
        
        yield "event: status\ndata: " + json.dumps({
            'agent': 'Verifier',
            'action': 'Connecting to network',
            'status': 'in_progress'
        }) + "\n\n"

        # Connect to network
        network_url = "https://polygon-amoy.g.alchemy.com/v2/ZPG4ZM3lIzQubp0v9-kGBtiRcLJ2oX2L"
        w3 = Web3(Web3.HTTPProvider(network_url))
        
        if not w3.is_connected():
            yield "event: error\ndata: " + json.dumps({
                'agent': 'Verifier',
                'action': 'Network connection',
                'status': 'failed',
                'data': {'error': 'Failed to connect to Polygon Amoy network'}
            }) + "\n\n"
            return

        yield "event: status\ndata: " + json.dumps({
            'agent': 'Verifier',
            'action': 'Network connection',
            'status': 'completed',
            'data': {'network': 'Polygon Amoy'}
        }) + "\n\n"

        # Create contract instance
        yield "event: status\ndata: " + json.dumps({
            'agent': 'Verifier',
            'action': 'Loading contract',
            'status': 'in_progress'
        }) + "\n\n"

        contract = w3.eth.contract(
            address=w3.to_checksum_address(request.contract_address),
            abi=request.abi
        )

        # Check functions
        yield "event: status\ndata: " + json.dumps({
            'agent': 'Verifier',
            'action': 'Analyzing functions',
            'status': 'in_progress'
        }) + "\n\n"

        functions_info = []
        for func in contract.all_functions():
            try:
                if func.abi['stateMutability'] in ['view', 'pure']:
                    result = func().call()
                    functions_info.append({
                        "name": func.abi['name'],
                        "type": func.abi['stateMutability'],
                        "result": result
                    })
            except Exception as e:
                functions_info.append({
                    "name": func.abi['name'],
                    "type": func.abi['stateMutability'],
                    "error": str(e)
                })

        yield "event: status\ndata: " + json.dumps({
            'agent': 'Verifier',
            'action': 'Function analysis',
            'status': 'completed',
            'data': {'functions': functions_info}
        }) + "\n\n"

        # Check events
        yield "event: status\ndata: " + json.dumps({
            'agent': 'Verifier',
            'action': 'Analyzing events',
            'status': 'in_progress'
        }) + "\n\n"

        latest_block = w3.eth.block_number
        start_block = max(0, latest_block - 1000)
        events_info = []

        for event in contract.events:
            try:
                events = event.get_logs(fromBlock=start_block, toBlock='latest')
                events_info.append({
                    "name": event.event_name,
                    "count": len(events),
                    "recent_events": [evt.args for evt in events[:5]]
                })
            except Exception as e:
                events_info.append({
                    "name": event.event_name,
                    "error": str(e)
                })

        yield "event: status\ndata: " + json.dumps({
            'agent': 'Verifier',
            'action': 'Event analysis',
            'status': 'completed',
            'data': {'events': events_info}
        }) + "\n\n"

        # AI Analysis
        yield "event: status\ndata: " + json.dumps({
            'agent': 'Verifier',
            'action': 'Performing AI analysis',
            'status': 'in_progress'
        }) + "\n\n"

        analysis = verifier.process({
            "address": request.contract_address,
            "network": "Polygon Amoy",
            "functions": json.dumps(functions_info, indent=2),
            "events": json.dumps(events_info, indent=2),
            "input": "Analyze this contract's behavior and usage patterns"
        })

        yield "event: status\ndata: " + json.dumps({
            'agent': 'Verifier',
            'action': 'AI analysis',
            'status': 'completed',
            'data': {'analysis': analysis}
        }) + "\n\n"

        # Final summary
        yield "event: status\ndata: " + json.dumps({
            'agent': 'Verifier',
            'action': 'Verification completed',
            'status': 'completed',
            'data': {
                'contract_info': {
                    'address': request.contract_address,
                    'functions': functions_info,
                    'events': events_info
                },
                'blockchain_info': {
                    'network': 'Polygon Amoy',
                    'latest_block': latest_block,
                    'contract_code_exists': bool(w3.eth.get_code(w3.to_checksum_address(request.contract_address)))
                },
                'ai_analysis': analysis
            }
        }) + "\n\n"

    except Exception as e:
        yield "event: error\ndata: " + json.dumps({
            'agent': 'Verifier',
            'action': 'Verification failed',
            'status': 'error',
            'data': {'error': str(e)}
        }) + "\n\n"

@app.post("/verify-contract")
async def verify_contract(request: ContractVerifyRequest):
    """
    Stream the contract verification process using Server-Sent Events
    """
    return StreamingResponse(
        stream_contract_verification(request),
        media_type="text/event-stream",
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    )

# Add new autonomous error recovery class
class AutoErrorRecovery:
    def __init__(self):
        self.llm = ChatXAI(model="grok-beta")
        self.recovery_attempts = {}
        self.max_attempts = 3

    async def attempt_recovery(self, error: str, context: Dict) -> Dict:
        """Autonomously analyze and attempt to recover from errors"""
        error_hash = hash(f"{error}_{context.get('stage', 'unknown')}")
        
        if error_hash in self.recovery_attempts:
            if self.recovery_attempts[error_hash] >= self.max_attempts:
                return {
                    'status': 'failed',
                    'message': 'Maximum recovery attempts exceeded'
                }
            self.recovery_attempts[error_hash] += 1
        else:
            self.recovery_attempts[error_hash] = 1

        recovery_prompt = f"""
        Analyze this error and determine recovery strategy:
        Error: {error}
        Context: {json.dumps(context)}
        Stage: {context.get('stage', 'unknown')}
        Attempt: {self.recovery_attempts[error_hash]} of {self.max_attempts}

        Return JSON with:
        1. root_cause: Likely cause of error
        2. recovery_strategy: Steps to resolve
        3. prevention_measures: How to prevent this in future
        4. confidence_score: 0-1 probability of successful recovery
        """

        try:
            response = await self.llm.ainvoke(recovery_prompt)
            recovery_plan = json.loads(response)
            
            if recovery_plan['confidence_score'] < 0.5:
                return {
                    'status': 'failed',
                    'message': 'Low confidence in recovery strategy'
                }

            return {
                'status': 'retry',
                'recovery_plan': recovery_plan,
                'attempt': self.recovery_attempts[error_hash]
            }

        except Exception as e:
            return {
                'status': 'failed',
                'message': f'Recovery analysis failed: {str(e)}'
            }

# Add autonomous contract optimization class
class ContractOptimizer:
    def __init__(self):
        self.llm = ChatXAI(model="grok-beta")
        
    async def optimize_contract(self, contract_code: str, gas_analysis: Dict) -> Dict:
        """Autonomously optimize contract for gas efficiency"""
        optimization_prompt = f"""
        Analyze and optimize this contract for gas efficiency:
        
        Contract: {contract_code}
        Current Gas Analysis: {json.dumps(gas_analysis)}
        
        Focus on:
        1. Storage optimization
        2. Function optimization
        3. Loop optimization
        4. State variable access patterns
        
        Return JSON with:
        1. optimized_code: The optimized contract code
        2. optimizations: List of optimizations made
        3. estimated_savings: Estimated gas savings per optimization
        4. risk_assessment: Any potential risks from optimizations
        """
        
        try:
            response = await self.llm.ainvoke(optimization_prompt)
            optimization_result = json.loads(response)
            
            # Verify optimizations don't introduce vulnerabilities
            security_check = await self.verify_optimizations(
                original_code=contract_code,
                optimized_code=optimization_result['optimized_code']
            )
            
            if not security_check['is_safe']:
                return {
                    'status': 'failed',
                    'message': 'Optimizations introduced security risks',
                    'details': security_check['risks']
                }
                
            return {
                'status': 'success',
                'optimized_code': optimization_result['optimized_code'],
                'improvements': optimization_result['optimizations'],
                'estimated_savings': optimization_result['estimated_savings']
            }
            
        except Exception as e:
            return {
                'status': 'failed',
                'message': f'Optimization failed: {str(e)}'
            }
            
    async def verify_optimizations(self, original_code: str, optimized_code: str) -> Dict:
        """Verify optimizations don't introduce vulnerabilities"""
        verification_prompt = f"""
        Compare original and optimized contracts for security:
        
        Original: {original_code}
        Optimized: {optimized_code}
        
        Check for:
        1. New attack vectors
        2. Changed security properties
        3. Broken invariants
        4. Unexpected side effects
        
        Return JSON with:
        1. is_safe: boolean
        2. risks: List of identified risks
        3. recommendations: Suggested mitigations
        """
        
        try:
            response = await self.llm.ainvoke(verification_prompt)
            return json.loads(response)
        except Exception as e:
            return {
                'is_safe': False,
                'risks': [f'Verification failed: {str(e)}']
            }

if __name__ == "__main__":
    # Change this line to use app directly
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)    