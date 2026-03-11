# 🛠️ Terminal Command Hanging - Implementation Guide

## 🎯 **Implementation Overview**

This guide provides step-by-step implementation of a comprehensive solution to prevent terminal command hanging caused by Thai characters and encoding issues.

**Target:** 95% reduction in command hanging incidents  
**Timeline:** 3 weeks implementation  
**ROI:** 25-30% productivity improvement  

---

## 🚀 **Phase 1: Immediate Fixes (Week 1)**

### **1.1 Command Sanitization System**

#### **Step 1: Create Command Sanitizer**

```typescript
// src/utils/commandSanitizer.ts
export class CommandSanitizer {
  private static readonly THAI_CHARS = /[\u0E00-\u0E7F]/g;
  private static readonly INVISIBLE_CHARS = /[\u200B-\u200D\uFEFF]/g;
  private static readonly CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g;
  
  /**
   * Sanitize command by removing problematic characters
   */
  static sanitize(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    return input
      .replace(this.THAI_CHARS, '') // Remove Thai characters
      .replace(this.INVISIBLE_CHARS, '') // Remove invisible characters
      .replace(this.CONTROL_CHARS, '') // Remove control characters
      .trim();
  }
  
  /**
   * Validate if command is safe to execute
   */
  static validate(command: string): ValidationResult {
    const issues: string[] = [];
    
    // Check for Thai characters
    if (this.THAI_CHARS.test(command)) {
      issues.push('Contains Thai characters');
    }
    
    // Check for invisible characters
    if (this.INVISIBLE_CHARS.test(command)) {
      issues.push('Contains invisible characters');
    }
    
    // Check for control characters
    if (this.CONTROL_CHARS.test(command)) {
      issues.push('Contains control characters');
    }
    
    // Check for empty command
    if (!command.trim()) {
      issues.push('Empty command');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      sanitized: this.sanitize(command)
    };
  }
  
  /**
   * Detect encoding issues in command
   */
  static detectEncodingIssues(command: string): boolean {
    // Check for mixed encoding
    const hasThai = this.THAI_CHARS.test(command);
    const hasEnglish = /[a-zA-Z]/.test(command);
    const hasNumbers = /[0-9]/.test(command);
    
    // Mixed encoding detected
    return hasThai && (hasEnglish || hasNumbers);
  }
}

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  sanitized: string;
}
```

#### **Step 2: Create Command Executor with Timeout**

```typescript
// src/utils/commandExecutor.ts
import { CommandSanitizer, ValidationResult } from './commandSanitizer';

export class CommandExecutor {
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  
  /**
   * Execute command with safety checks and timeout
   */
  static async executeCommand(
    command: string, 
    timeout: number = this.DEFAULT_TIMEOUT
  ): Promise<ExecutionResult> {
    // Step 1: Validate and sanitize command
    const validation = CommandSanitizer.validate(command);
    
    if (!validation.isValid) {
      return {
        success: false,
        error: `Command validation failed: ${validation.issues.join(', ')}`,
        originalCommand: command,
        sanitizedCommand: validation.sanitized,
        executionTime: 0
      };
    }
    
    // Step 2: Execute with timeout
    const startTime = Date.now();
    
    try {
      const result = await this.executeWithTimeout(validation.sanitized, timeout);
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        result,
        originalCommand: command,
        sanitizedCommand: validation.sanitized,
        executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        originalCommand: command,
        sanitizedCommand: validation.sanitized,
        executionTime
      };
    }
  }
  
  /**
   * Execute command with timeout protection
   */
  private static async executeWithTimeout(
    command: string, 
    timeout: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);
      
      // Simulate command execution (replace with actual implementation)
      setTimeout(() => {
        clearTimeout(timer);
        resolve(`Command executed: ${command}`);
      }, 1000);
    });
  }
}

export interface ExecutionResult {
  success: boolean;
  result?: string;
  error?: string;
  originalCommand: string;
  sanitizedCommand: string;
  executionTime: number;
}
```

#### **Step 3: Create Command Monitor**

```typescript
// src/utils/commandMonitor.ts
export class CommandMonitor {
  private static commandHistory: CommandExecution[] = [];
  private static readonly MAX_HISTORY = 100;
  
  /**
   * Log command execution
   */
  static logExecution(result: ExecutionResult): void {
    const execution: CommandExecution = {
      timestamp: new Date(),
      success: result.success,
      originalCommand: result.originalCommand,
      sanitizedCommand: result.sanitizedCommand,
      executionTime: result.executionTime,
      error: result.error
    };
    
    this.commandHistory.unshift(execution);
    
    // Keep only recent history
    if (this.commandHistory.length > this.MAX_HISTORY) {
      this.commandHistory = this.commandHistory.slice(0, this.MAX_HISTORY);
    }
    
    // Log to console for debugging
    console.log('Command Execution:', execution);
  }
  
  /**
   * Get command execution statistics
   */
  static getStatistics(): CommandStatistics {
    const total = this.commandHistory.length;
    const successful = this.commandHistory.filter(c => c.success).length;
    const failed = total - successful;
    const avgExecutionTime = this.commandHistory.reduce((sum, c) => sum + c.executionTime, 0) / total;
    
    return {
      totalCommands: total,
      successfulCommands: successful,
      failedCommands: failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageExecutionTime: avgExecutionTime,
      recentFailures: this.commandHistory.filter(c => !c.success).slice(0, 10)
    };
  }
  
  /**
   * Detect patterns in command failures
   */
  static detectFailurePatterns(): FailurePattern[] {
    const failures = this.commandHistory.filter(c => !c.success);
    const patterns: FailurePattern[] = [];
    
    // Group by error type
    const errorGroups = failures.reduce((groups, failure) => {
      const errorType = failure.error || 'Unknown';
      if (!groups[errorType]) {
        groups[errorType] = [];
      }
      groups[errorType].push(failure);
      return groups;
    }, {} as Record<string, CommandExecution[]>);
    
    // Identify patterns
    Object.entries(errorGroups).forEach(([errorType, failures]) => {
      if (failures.length >= 3) {
        patterns.push({
          errorType,
          frequency: failures.length,
          percentage: (failures.length / failures.length) * 100,
          examples: failures.slice(0, 3).map(f => f.originalCommand)
        });
      }
    });
    
    return patterns;
  }
}

export interface CommandExecution {
  timestamp: Date;
  success: boolean;
  originalCommand: string;
  sanitizedCommand: string;
  executionTime: number;
  error?: string;
}

export interface CommandStatistics {
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  successRate: number;
  averageExecutionTime: number;
  recentFailures: CommandExecution[];
}

export interface FailurePattern {
  errorType: string;
  frequency: number;
  percentage: number;
  examples: string[];
}
```

### **1.2 PowerShell Configuration**

#### **Step 4: Create Enhanced PowerShell Profile**

```powershell
# PowerShell profile: $PROFILE
# Enhanced PowerShell configuration for command safety

# Set consistent encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

# Default parameter values
$PSDefaultParameterValues = @{
    'Out-File:Encoding' = 'utf8'
    'Export-Csv:Encoding' = 'utf8'
    'Import-Csv:Encoding' = 'utf8'
}

# Command sanitization function
function Remove-ProblematicCharacters {
    param([string]$InputString)
    
    if ([string]::IsNullOrEmpty($InputString)) {
        return ""
    }
    
    # Remove Thai characters (U+0E00-U+0E7F)
    $cleaned = $InputString -replace '[\u0E00-\u0E7F]', ''
    
    # Remove invisible characters
    $cleaned = $cleaned -replace '[\u200B-\u200D\uFEFF]', ''
    
    # Remove control characters
    $cleaned = $cleaned -replace '[\u0000-\u001F\u007F-\u009F]', ''
    
    return $cleaned.Trim()
}

# Safe command execution function
function Invoke-SafeCommand {
    param(
        [string]$Command,
        [int]$TimeoutSeconds = 30
    )
    
    # Sanitize command
    $cleanCommand = Remove-ProblematicCharacters -InputString $Command
    
    if ([string]::IsNullOrEmpty($cleanCommand)) {
        Write-Error "Command is empty after sanitization"
        return
    }
    
    # Log original and cleaned command
    Write-Host "Original: $Command" -ForegroundColor Yellow
    Write-Host "Cleaned:  $cleanCommand" -ForegroundColor Green
    
    # Execute with timeout
    $job = Start-Job -ScriptBlock { 
        param($cmd)
        Invoke-Expression $cmd
    } -ArgumentList $cleanCommand
    
    try {
        $result = Wait-Job $job -Timeout $TimeoutSeconds
        
        if ($result) {
            $output = Receive-Job $job
            Remove-Job $job
            return $output
        } else {
            Stop-Job $job
            Remove-Job $job
            throw "Command timed out after $TimeoutSeconds seconds"
        }
    } catch {
        if ($job.State -eq 'Running') {
            Stop-Job $job
            Remove-Job $job
        }
        throw $_.Exception
    }
}

# Alias for easy use
Set-Alias -Name "safe" -Value "Invoke-SafeCommand"

# Command validation function
function Test-CommandSafety {
    param([string]$Command)
    
    $issues = @()
    
    # Check for Thai characters
    if ($Command -match '[\u0E00-\u0E7F]') {
        $issues += "Contains Thai characters"
    }
    
    # Check for invisible characters
    if ($Command -match '[\u200B-\u200D\uFEFF]') {
        $issues += "Contains invisible characters"
    }
    
    # Check for control characters
    if ($Command -match '[\u0000-\u001F\u007F-\u009F]') {
        $issues += "Contains control characters"
    }
    
    return @{
        IsSafe = $issues.Count -eq 0
        Issues = $issues
        CleanedCommand = Remove-ProblematicCharacters -InputString $Command
    }
}

# Enhanced prompt function
function prompt {
    $currentPath = (Get-Location).Path
    $gitBranch = ""
    
    # Check if in git repository
    if (Test-Path ".git") {
        $gitBranch = git branch --show-current 2>$null
        if ($gitBranch) {
            $gitBranch = " [$gitBranch]"
        }
    }
    
    Write-Host "PS " -NoNewline -ForegroundColor Blue
    Write-Host "$currentPath" -NoNewline -ForegroundColor Green
    Write-Host "$gitBranch" -NoNewline -ForegroundColor Yellow
    Write-Host "> " -NoNewline -ForegroundColor Blue
    
    return " "
}

# Load profile message
Write-Host "Enhanced PowerShell profile loaded successfully!" -ForegroundColor Green
Write-Host "Use 'safe <command>' for safe command execution" -ForegroundColor Cyan
Write-Host "Use 'Test-CommandSafety <command>' to validate commands" -ForegroundColor Cyan
```

---

## 🚀 **Phase 2: Enhanced Protection (Week 2)**

### **2.1 AI Integration Enhancement**

#### **Step 5: Create AI Command Filter**

```typescript
// src/utils/aiCommandFilter.ts
export class AICommandFilter {
  private static readonly COMMAND_PATTERNS = [
    /^git\s+/,
    /^npm\s+/,
    /^yarn\s+/,
    /^node\s+/,
    /^cd\s+/,
    /^ls\s*/,
    /^mkdir\s+/,
    /^rm\s+/,
    /^cp\s+/,
    /^mv\s+/,
    /^chmod\s+/,
    /^chown\s+/,
    /^ps\s*/,
    /^kill\s+/,
    /^taskkill\s+/,
    /^netstat\s*/,
    /^ping\s+/,
    /^curl\s+/,
    /^wget\s+/,
    /^tar\s+/,
    /^zip\s+/,
    /^unzip\s+/,
    /^grep\s+/,
    /^find\s+/,
    /^cat\s+/,
    /^echo\s+/,
    /^touch\s+/,
    /^chcp\s+/
  ];
  
  /**
   * Filter AI-generated commands
   */
  static filterAIOutput(aiResponse: string): FilteredCommands {
    const commands = this.extractCommands(aiResponse);
    const filtered = commands.map(cmd => this.processCommand(cmd));
    
    return {
      original: aiResponse,
      extractedCommands: commands,
      processedCommands: filtered,
      safeCommands: filtered.filter(cmd => cmd.isSafe),
      unsafeCommands: filtered.filter(cmd => !cmd.isSafe),
      statistics: this.generateStatistics(filtered)
    };
  }
  
  /**
   * Extract commands from AI response
   */
  private static extractCommands(text: string): string[] {
    const commands: string[] = [];
    
    // Split by lines and look for command patterns
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Check if line looks like a command
      if (this.looksLikeCommand(trimmed)) {
        commands.push(trimmed);
      }
    }
    
    return commands;
  }
  
  /**
   * Check if text looks like a command
   */
  private static looksLikeCommand(text: string): boolean {
    // Check for command patterns
    for (const pattern of this.COMMAND_PATTERNS) {
      if (pattern.test(text)) {
        return true;
      }
    }
    
    // Check for common command indicators
    const indicators = ['$', '>', 'PS ', 'C:\\', '/', '\\'];
    return indicators.some(indicator => text.startsWith(indicator));
  }
  
  /**
   * Process individual command
   */
  private static processCommand(command: string): ProcessedCommand {
    const sanitized = CommandSanitizer.sanitize(command);
    const validation = CommandSanitizer.validate(command);
    const encodingIssues = CommandSanitizer.detectEncodingIssues(command);
    
    return {
      original: command,
      sanitized,
      isSafe: validation.isValid && !encodingIssues,
      issues: validation.issues,
      hasEncodingIssues: encodingIssues,
      commandType: this.detectCommandType(sanitized),
      riskLevel: this.assessRiskLevel(sanitized)
    };
  }
  
  /**
   * Detect command type
   */
  private static detectCommandType(command: string): CommandType {
    if (command.startsWith('git ')) return 'git';
    if (command.startsWith('npm ')) return 'npm';
    if (command.startsWith('yarn ')) return 'yarn';
    if (command.startsWith('node ')) return 'node';
    if (command.startsWith('cd ')) return 'navigation';
    if (command.startsWith('ls') || command.startsWith('dir')) return 'listing';
    if (command.startsWith('mkdir ')) return 'file_operation';
    if (command.startsWith('rm ') || command.startsWith('del ')) return 'deletion';
    if (command.startsWith('taskkill ') || command.startsWith('kill ')) return 'process_management';
    return 'other';
  }
  
  /**
   * Assess risk level of command
   */
  private static assessRiskLevel(command: string): RiskLevel {
    const highRiskPatterns = [
      /rm\s+-rf/,
      /del\s+\/s/,
      /taskkill\s+\/f/,
      /format\s+/,
      /shutdown\s+/,
      /reboot\s+/
    ];
    
    const mediumRiskPatterns = [
      /git\s+push/,
      /npm\s+install/,
      /yarn\s+install/,
      /chmod\s+/,
      /chown\s+/
    ];
    
    for (const pattern of highRiskPatterns) {
      if (pattern.test(command)) {
        return 'high';
      }
    }
    
    for (const pattern of mediumRiskPatterns) {
      if (pattern.test(command)) {
        return 'medium';
      }
    }
    
    return 'low';
  }
  
  /**
   * Generate statistics
   */
  private static generateStatistics(commands: ProcessedCommand[]): CommandStatistics {
    const total = commands.length;
    const safe = commands.filter(c => c.isSafe).length;
    const unsafe = total - safe;
    const highRisk = commands.filter(c => c.riskLevel === 'high').length;
    const mediumRisk = commands.filter(c => c.riskLevel === 'medium').length;
    const lowRisk = commands.filter(c => c.riskLevel === 'low').length;
    
    return {
      totalCommands: total,
      safeCommands: safe,
      unsafeCommands: unsafe,
      highRiskCommands: highRisk,
      mediumRiskCommands: mediumRisk,
      lowRiskCommands: lowRisk,
      safetyRate: total > 0 ? (safe / total) * 100 : 0
    };
  }
}

export interface FilteredCommands {
  original: string;
  extractedCommands: string[];
  processedCommands: ProcessedCommand[];
  safeCommands: ProcessedCommand[];
  unsafeCommands: ProcessedCommand[];
  statistics: CommandStatistics;
}

export interface ProcessedCommand {
  original: string;
  sanitized: string;
  isSafe: boolean;
  issues: string[];
  hasEncodingIssues: boolean;
  commandType: CommandType;
  riskLevel: RiskLevel;
}

export type CommandType = 
  | 'git' 
  | 'npm' 
  | 'yarn' 
  | 'node' 
  | 'navigation' 
  | 'listing' 
  | 'file_operation' 
  | 'deletion' 
  | 'process_management' 
  | 'other';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface CommandStatistics {
  totalCommands: number;
  safeCommands: number;
  unsafeCommands: number;
  highRiskCommands: number;
  mediumRiskCommands: number;
  lowRiskCommands: number;
  safetyRate: number;
}
```

### **2.2 Terminal Environment Hardening**

#### **Step 6: Create Terminal Configuration Manager**

```typescript
// src/utils/terminalConfigManager.ts
export class TerminalConfigManager {
  private static readonly CONFIG_FILE = 'terminal-config.json';
  
  /**
   * Initialize terminal configuration
   */
  static async initialize(): Promise<void> {
    const config = await this.loadConfig();
    await this.applyConfig(config);
  }
  
  /**
   * Load terminal configuration
   */
  private static async loadConfig(): Promise<TerminalConfig> {
    try {
      const configData = await this.readConfigFile();
      return JSON.parse(configData);
    } catch (error) {
      // Return default configuration
      return this.getDefaultConfig();
    }
  }
  
  /**
   * Get default configuration
   */
  private static getDefaultConfig(): TerminalConfig {
    return {
      encoding: {
        input: 'utf8',
        output: 'utf8',
        console: 'utf8'
      },
      timeout: {
        default: 30000,
        git: 60000,
        npm: 120000,
        build: 300000
      },
      safety: {
        enableSanitization: true,
        enableTimeout: true,
        enableMonitoring: true,
        maxCommandLength: 1000
      },
      logging: {
        enableCommandLogging: true,
        enableErrorLogging: true,
        maxLogEntries: 1000
      }
    };
  }
  
  /**
   * Apply terminal configuration
   */
  private static async applyConfig(config: TerminalConfig): Promise<void> {
    // Set encoding
    await this.setEncoding(config.encoding);
    
    // Set timeouts
    this.setTimeouts(config.timeout);
    
    // Configure safety settings
    this.configureSafety(config.safety);
    
    // Configure logging
    this.configureLogging(config.logging);
  }
  
  /**
   * Set terminal encoding
   */
  private static async setEncoding(encoding: EncodingConfig): Promise<void> {
    // This would be implemented based on the terminal type
    console.log('Setting encoding:', encoding);
  }
  
  /**
   * Set command timeouts
   */
  private static setTimeouts(timeouts: TimeoutConfig): void {
    // Store timeout configuration
    console.log('Setting timeouts:', timeouts);
  }
  
  /**
   * Configure safety settings
   */
  private static configureSafety(safety: SafetyConfig): void {
    // Configure safety settings
    console.log('Configuring safety:', safety);
  }
  
  /**
   * Configure logging
   */
  private static configureLogging(logging: LoggingConfig): void {
    // Configure logging
    console.log('Configuring logging:', logging);
  }
  
  /**
   * Read configuration file
   */
  private static async readConfigFile(): Promise<string> {
    // Implementation depends on file system access
    return '{}';
  }
}

export interface TerminalConfig {
  encoding: EncodingConfig;
  timeout: TimeoutConfig;
  safety: SafetyConfig;
  logging: LoggingConfig;
}

export interface EncodingConfig {
  input: string;
  output: string;
  console: string;
}

export interface TimeoutConfig {
  default: number;
  git: number;
  npm: number;
  build: number;
}

export interface SafetyConfig {
  enableSanitization: boolean;
  enableTimeout: boolean;
  enableMonitoring: boolean;
  maxCommandLength: number;
}

export interface LoggingConfig {
  enableCommandLogging: boolean;
  enableErrorLogging: boolean;
  maxLogEntries: number;
}
```

---

## 🚀 **Phase 3: Advanced Features (Week 3)**

### **3.1 Predictive Prevention System**

#### **Step 7: Create ML-based Command Validator**

```typescript
// src/utils/mlCommandValidator.ts
export class MLCommandValidator {
  private static commandPatterns: Map<string, number> = new Map();
  private static failurePatterns: Map<string, number> = new Map();
  
  /**
   * Train the validator with command history
   */
  static train(history: CommandExecution[]): void {
    // Analyze successful commands
    const successful = history.filter(c => c.success);
    successful.forEach(cmd => {
      const pattern = this.extractPattern(cmd.sanitizedCommand);
      this.commandPatterns.set(pattern, (this.commandPatterns.get(pattern) || 0) + 1);
    });
    
    // Analyze failed commands
    const failed = history.filter(c => !c.success);
    failed.forEach(cmd => {
      const pattern = this.extractPattern(cmd.originalCommand);
      this.failurePatterns.set(pattern, (this.failurePatterns.get(pattern) || 0) + 1);
    });
  }
  
  /**
   * Predict command success probability
   */
  static predict(command: string): PredictionResult {
    const pattern = this.extractPattern(command);
    const successCount = this.commandPatterns.get(pattern) || 0;
    const failureCount = this.failurePatterns.get(pattern) || 0;
    const total = successCount + failureCount;
    
    const successProbability = total > 0 ? successCount / total : 0.5;
    const confidence = total > 0 ? Math.min(total / 10, 1) : 0;
    
    return {
      command,
      pattern,
      successProbability,
      confidence,
      recommendation: this.getRecommendation(successProbability, confidence),
      riskFactors: this.identifyRiskFactors(command)
    };
  }
  
  /**
   * Extract pattern from command
   */
  private static extractPattern(command: string): string {
    // Replace specific values with placeholders
    return command
      .replace(/\b[a-f0-9]{8,}\b/g, '<hash>') // Git hashes
      .replace(/\b\d+\.\d+\.\d+\b/g, '<version>') // Version numbers
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '<email>') // Email addresses
      .replace(/\b(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?\b/g, '<url>') // URLs
      .replace(/\b[A-Za-z]:\\[^\s]*\b/g, '<path>') // Windows paths
      .replace(/\b\/[^\s]*\b/g, '<path>') // Unix paths
      .replace(/\b\d+\b/g, '<number>'); // Numbers
  }
  
  /**
   * Get recommendation based on prediction
   */
  private static getRecommendation(probability: number, confidence: number): Recommendation {
    if (confidence < 0.3) {
      return 'unknown';
    }
    
    if (probability > 0.8) {
      return 'safe';
    } else if (probability > 0.5) {
      return 'caution';
    } else {
      return 'danger';
    }
  }
  
  /**
   * Identify risk factors in command
   */
  private static identifyRiskFactors(command: string): string[] {
    const factors: string[] = [];
    
    // Check for dangerous patterns
    if (command.includes('rm -rf')) factors.push('Recursive deletion');
    if (command.includes('taskkill /f')) factors.push('Force kill processes');
    if (command.includes('format')) factors.push('Disk formatting');
    if (command.includes('shutdown')) factors.push('System shutdown');
    
    // Check for encoding issues
    if (/[\u0E00-\u0E7F]/.test(command)) factors.push('Thai characters');
    if (/[\u200B-\u200D\uFEFF]/.test(command)) factors.push('Invisible characters');
    
    // Check for long commands
    if (command.length > 500) factors.push('Very long command');
    
    return factors;
  }
}

export interface PredictionResult {
  command: string;
  pattern: string;
  successProbability: number;
  confidence: number;
  recommendation: Recommendation;
  riskFactors: string[];
}

export type Recommendation = 'safe' | 'caution' | 'danger' | 'unknown';
```

### **3.2 User Training System**

#### **Step 8: Create Command Education System**

```typescript
// src/utils/commandEducation.ts
export class CommandEducation {
  private static readonly BEST_PRACTICES = [
    {
      category: 'Git Commands',
      practices: [
        'Always use "git add ." instead of "แgit add ."',
        'Check command before execution',
        'Use descriptive commit messages',
        'Verify branch before pushing'
      ]
    },
    {
      category: 'Package Management',
      practices: [
        'Use "npm install" instead of "แnpm install"',
        'Check package.json before installing',
        'Use exact versions for production',
        'Clean node_modules if issues occur'
      ]
    },
    {
      category: 'File Operations',
      practices: [
        'Use "ls" instead of "แls"',
        'Verify paths before operations',
        'Use relative paths when possible',
        'Backup important files'
      ]
    }
  ];
  
  /**
   * Get educational content for command
   */
  static getEducationForCommand(command: string): EducationContent {
    const category = this.categorizeCommand(command);
    const practices = this.BEST_PRACTICES.find(p => p.category === category);
    
    return {
      command,
      category,
      bestPractices: practices?.practices || [],
      commonMistakes: this.getCommonMistakes(category),
      examples: this.getExamples(category),
      tips: this.getTips(category)
    };
  }
  
  /**
   * Categorize command
   */
  private static categorizeCommand(command: string): string {
    if (command.startsWith('git ')) return 'Git Commands';
    if (command.startsWith('npm ') || command.startsWith('yarn ')) return 'Package Management';
    if (command.startsWith('ls') || command.startsWith('cd ') || command.startsWith('mkdir ')) return 'File Operations';
    if (command.startsWith('taskkill ') || command.startsWith('kill ')) return 'Process Management';
    return 'General Commands';
  }
  
  /**
   * Get common mistakes for category
   */
  private static getCommonMistakes(category: string): string[] {
    const mistakes: Record<string, string[]> = {
      'Git Commands': [
        'Using Thai characters in commands',
        'Not checking branch before push',
        'Using generic commit messages',
        'Force pushing without backup'
      ],
      'Package Management': [
        'Installing packages with encoding issues',
        'Not checking package versions',
        'Installing global packages unnecessarily',
        'Not cleaning cache when issues occur'
      ],
      'File Operations': [
        'Using commands with invisible characters',
        'Not verifying file paths',
        'Deleting files without backup',
        'Using absolute paths unnecessarily'
      ]
    };
    
    return mistakes[category] || [];
  }
  
  /**
   * Get examples for category
   */
  private static getExamples(category: string): CommandExample[] {
    const examples: Record<string, CommandExample[]> = {
      'Git Commands': [
        { good: 'git add .', bad: 'แgit add .', explanation: 'Clean command without Thai characters' },
        { good: 'git commit -m "Add new feature"', bad: 'แgit commit -m "Add new feature"', explanation: 'Descriptive commit message' },
        { good: 'git push origin main', bad: 'แgit push origin main', explanation: 'Explicit branch specification' }
      ],
      'Package Management': [
        { good: 'npm install', bad: 'แnpm install', explanation: 'Clean package installation' },
        { good: 'npm run build', bad: 'แnpm run build', explanation: 'Standard build command' },
        { good: 'npm ci', bad: 'แnpm ci', explanation: 'Clean install for production' }
      ]
    };
    
    return examples[category] || [];
  }
  
  /**
   * Get tips for category
   */
  private static getTips(category: string): string[] {
    const tips: Record<string, string[]> = {
      'Git Commands': [
        'Always check command before execution',
        'Use git status to verify changes',
        'Create feature branches for new work',
        'Use meaningful commit messages'
      ],
      'Package Management': [
        'Check package.json before installing',
        'Use npm audit to check for vulnerabilities',
        'Keep dependencies up to date',
        'Use exact versions for production'
      ]
    };
    
    return tips[category] || [];
  }
}

export interface EducationContent {
  command: string;
  category: string;
  bestPractices: string[];
  commonMistakes: string[];
  examples: CommandExample[];
  tips: string[];
}

export interface CommandExample {
  good: string;
  bad: string;
  explanation: string;
}
```

---

## 📊 **Implementation Checklist**

### **Week 1: Immediate Fixes**
- [ ] Create CommandSanitizer class
- [ ] Implement CommandExecutor with timeout
- [ ] Set up CommandMonitor
- [ ] Configure PowerShell profile
- [ ] Test basic sanitization

### **Week 2: Enhanced Protection**
- [ ] Implement AICommandFilter
- [ ] Create TerminalConfigManager
- [ ] Set up enhanced PowerShell functions
- [ ] Test AI integration
- [ ] Validate command filtering

### **Week 3: Advanced Features**
- [ ] Implement MLCommandValidator
- [ ] Create CommandEducation system
- [ ] Set up predictive prevention
- [ ] Test ML predictions
- [ ] Deploy user training

---

## 🎯 **Testing Strategy**

### **1. Unit Testing**
```typescript
// Test command sanitization
describe('CommandSanitizer', () => {
  it('should remove Thai characters', () => {
    const result = CommandSanitizer.sanitize('แgit add .');
    expect(result).toBe('git add .');
  });
  
  it('should remove invisible characters', () => {
    const result = CommandSanitizer.sanitize('\u200Bgit add .');
    expect(result).toBe('git add .');
  });
});
```

### **2. Integration Testing**
```typescript
// Test command execution
describe('CommandExecutor', () => {
  it('should execute safe commands', async () => {
    const result = await CommandExecutor.executeCommand('git status');
    expect(result.success).toBe(true);
  });
  
  it('should reject unsafe commands', async () => {
    const result = await CommandExecutor.executeCommand('แgit add .');
    expect(result.success).toBe(false);
  });
});
```

### **3. End-to-End Testing**
```typescript
// Test complete workflow
describe('Terminal Workflow', () => {
  it('should handle AI-generated commands', async () => {
    const aiResponse = 'แgit add .\ngit commit -m "test"';
    const filtered = AICommandFilter.filterAIOutput(aiResponse);
    expect(filtered.safeCommands.length).toBe(1);
  });
});
```

---

## 📈 **Success Metrics**

### **Primary Metrics**
- **Command Success Rate:** Target 99%+
- **Hanging Incidents:** Target <1 per day
- **Recovery Time:** Target <30 seconds

### **Secondary Metrics**
- **User Satisfaction:** Target 9/10
- **Development Speed:** Target 25% improvement
- **Error Reduction:** Target 90% reduction

---

**Last Updated:** December 2024  
**Implementation Version:** 1.0  
**Status:** ✅ Ready for Implementation  
**Priority:** 🚨 Critical - Immediate Action Required
