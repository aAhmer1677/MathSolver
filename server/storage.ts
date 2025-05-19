import { users, type User, type InsertUser, type MathProblem } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  saveMathProblem(problem: Omit<MathProblem, 'id'>): Promise<MathProblem>;
  getMathProblem(id: number): Promise<MathProblem | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private mathProblems: Map<number, MathProblem>;
  currentUserId: number;
  currentMathProblemId: number;

  constructor() {
    this.users = new Map();
    this.mathProblems = new Map();
    this.currentUserId = 1;
    this.currentMathProblemId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async saveMathProblem(problemData: Omit<MathProblem, 'id'>): Promise<MathProblem> {
    const id = this.currentMathProblemId++;
    const problem: MathProblem = { ...problemData, id };
    this.mathProblems.set(id, problem);
    return problem;
  }

  async getMathProblem(id: number): Promise<MathProblem | undefined> {
    return this.mathProblems.get(id);
  }
}

export const storage = new MemStorage();
