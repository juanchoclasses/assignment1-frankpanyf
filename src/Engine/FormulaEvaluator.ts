import Cell from "./Cell"
import SheetMemory from "./SheetMemory"
import { ErrorMessages } from "./GlobalDefinitions";



export class FormulaEvaluator {
  // Define a function called update that takes a string parameter and returns a number
  private _errorOccured: boolean = false;
  private _errorMessage: string = "";
  private _currentFormula: FormulaType = [];
  private _lastResult: number = 0;
  private _sheetMemory: SheetMemory;
  private _result: number = 0;

  constructor(memory: SheetMemory) {
    this._sheetMemory = memory;
  }

/**
 * evaluate the formula and set the result and error message
 * @param formula - the formula to evaluate
 */

  evaluate(formula: FormulaType) {

// reset the error message and error flag
    this._errorOccured = false;
    this._errorMessage = "";

// reset the formula
    const values: number[] = [];
    const operators: TokenType[] = [];
    const length = formula.length;
    let elementCounter = 0;

// check if the formula is valid
    if (formula.length > 3 && this.isOperator(formula[length - 1]) == true && this.isOperator(formula[length - 2]) == false) {
      formula = formula.slice(0, length - 1);
      this._errorMessage = ErrorMessages.invalidFormula;
      this._errorOccured = true;
    }

// check missed expression error
  if (formula.length === 2 && formula[0] === "(" && formula[1] === ")") {
    this._errorMessage = ErrorMessages.missingParentheses;
    this._errorOccured = true;
    this._result = 0;
    return;
  }

// check divide by zero error
  if (Number(formula[length - 1]) == 0 && formula[length - 2] == "/") {
    this._errorMessage = ErrorMessages.divideByZero;
    this._errorOccured = true;
    this._result = Infinity;
    return;
  }

// check empty formula error
  if (formula.length === 0) {
    this._errorMessage = ErrorMessages.emptyFormula;
    this._errorOccured = true;
    return;
  }

//check if there is no integer in the formula
  for (let j = 0; j < formula.length; j++) {
    if (typeof Number(formula[j]) == "undefined") {
      elementCounter = elementCounter + 1;
    }
  }
  if (elementCounter == formula.length) {
    this._errorMessage = ErrorMessages.invalidFormula;
    this._errorOccured = true;
    this._result = 0;
    return;
  }

//the process of evaluating the formula
  for (let i = 0; i < formula.length; i++) {
    const token = formula[i];

//push the number to the values array
    if (this.isNumber(token)) {
      values.push(Number(token));

//get the value of the cell and push it to the values array
    } else if (this.isCellReference(token)) {
      const [value, error] = this.getCellValue(token);
      if (error) {
        this._errorMessage = error;
        this._errorOccured = true;
        return;
      }
      values.push(value);

//push onto the operators array to fix opening parentheses
    } else if (token === "(") {
      operators.push(token);

//evaluate the operators array to fix closing parentheses
    } else if (token === ")") {
      while (operators.length && operators[operators.length - 1] !== "(") {
        this.evaluateOperator(values, operators);
      }
      operators.pop();

//evaluate the operators array to fix the operators precedence} 
    }   else if (this.isOperator(token)) {
        while (
          operators.length &&
          this.precedence(operators[operators.length - 1]) >= this.precedence(token)
        ) {
          this.evaluateOperator(values, operators);
        }
        operators.push(token);

  //check invalid formula error
      } else {
        this._errorMessage = ErrorMessages.invalidFormula;
        this._errorOccured = true;
        return;
      }
    }

//evaluate remaining operators
    while (operators.length) {
      this.evaluateOperator(values, operators);
    }


//set the result to the final value, if the formula is invalid set the result to 0, or if the formula is empty set the result to 0
    if (values.length !== 1 || isNaN(values[0])) {
      this._errorMessage = this._errorMessage || ErrorMessages.invalidFormula;
      this._result = Number(formula[0]);
      this._errorOccured = true;
      return;
    } else if (values.length !== 1) {
      this._errorMessage = this._errorMessage || ErrorMessages.invalidFormula;
      this._result = 0;
      this._errorOccured = true;
    } else {
      this._result = values.pop()!;// Set result to final value
    }

  }

  /**
   * @returns error message if an error occured
   */
  public get error(): string {
    return this._errorMessage
  }

  /**
   * @returns the result of the evaluation
   */
   public get result(): number {
    return this._result;
  }

/**
 * use the top two values in the values array and the top operator in the operators array to evaluate the expression
 * @param values - the values array
 * @param operators - array of operators
 */
  private evaluateOperator(values: number[], operators: TokenType[]) {
    const operator = operators.pop();
    const operand2 = values.pop();
    const operand1 = values.pop();
    if (operator && operand1 !== undefined && operand2 !== undefined) {
      switch (operator) {
        case "+":
          values.push(operand1 + operand2);
          break;
        case "-":
          values.push(operand1 - operand2);
          break;
        case "*":
          values.push(operand1 * operand2);
          break;
          case "/":
            if (operand2 == 0) {
              this._errorMessage = ErrorMessages.divideByZero;
              this._errorOccured = true;
              this._result = Infinity;
              break
            } else {
              values.push(operand1 / operand2);
            }
            break;
          default:
            this._errorMessage = ErrorMessages.invalidOperator;
            this._errorOccured = true;
            break;
        }
      } else {
        this._errorMessage = ErrorMessages.invalidOperator;
        this._errorOccured = true;
      }
    }

  /**
   * Determines the precedence of an operator
   * @param operator - the operator to check
   * @returns - true if the operator is valid
   */
   private precedence(operator: TokenType): number {
    switch (operator) {
      case "+":
      case "-":
        return 1;
      case "*":
      case "/":
        return 2;
      default:
        return 0;
    }
  }

/**
 * checks if the token is an operator
 * @param token - the token to check
 * @returns - true if the token is an operator
 */
  private isOperator(token: TokenType): boolean {
    return ["+", "-", "*", "/"].includes(token);
  }

  /**
   * 
   * @param token 
   * @returns true if the toke can be parsed to a number
   */
  
  isNumber(token: TokenType): boolean {
    return !isNaN(Number(token));
  }

  /**
   * 
   * @param token
   * @returns true if the token is a cell reference
   * 
   */
  isCellReference(token: TokenType): boolean {

    return Cell.isValidCellLabel(token);
  }

  /**
   * 
   * @param token
   * @returns [value, ""] if the cell formula is not empty and has no error
   * @returns [0, error] if the cell has an error
   * @returns [0, ErrorMessages.invalidCell] if the cell formula is empty
   * 
   */
  getCellValue(token: TokenType): [number, string] {

    let cell = this._sheetMemory.getCellByLabel(token);
    let formula = cell.getFormula();
    let error = cell.getError();

    // if the cell has an error return 0
    if (error !== "" && error !== ErrorMessages.emptyFormula) {
      return [0, error];
    }

    // if the cell formula is empty return 0
    if (formula.length === 0) {
      return [0, ErrorMessages.invalidCell];
    }


    let value = cell.getValue();
    return [value, ""];

  }


}

export default FormulaEvaluator;