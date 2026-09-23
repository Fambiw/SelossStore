import { Auth } from '../js/auth.js';
import { DB } from '../js/db.js';

describe('Auth Module', () => {
  beforeEach(() => {
    localStorage.clear();
    Auth.cu = null; // Reset current user
  });

  describe('Registration', () => {
    it('should register a new user successfully', () => {
      // Arrange & Act
      const user = Auth.reg('John Doe', 'john@example.com', 'password123');
      
      // Assert
      expect(user).toBeDefined();
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
      
      const savedUser = DB.findU('john@example.com');
      expect(savedUser).toBeDefined();
    });

    it('should fail with invalid email', () => {
      expect(() => {
        Auth.reg('John', 'invalid-email', '123456');
      }).toThrow('Format email tidak valid');
    });

    it('should fail if email is already registered', () => {
      Auth.reg('John', 'test@example.com', '123456');
      
      expect(() => {
        Auth.reg('Jane', 'test@example.com', '654321');
      }).toThrow('Email sudah terdaftar');
    });

    it('should trim and normalize email input before validation and storage', () => {
      const user = Auth.reg('  John Doe  ', '  JOHN@EXAMPLE.COM  ', 'password123');

      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
      expect(DB.findU('john@example.com')).toEqual(user);
      expect(() => Auth.login('  JOHN@EXAMPLE.COM  ', 'password123')).not.toThrow();
    });
  });

  describe('Login', () => {
    beforeEach(() => {
      Auth.reg('Test User', 'test@example.com', 'password123');
    });

    it('should login successfully with correct credentials', () => {
      const user = Auth.login('test@example.com', 'password123');
      expect(user).toBeDefined();
      expect(Auth.cu.email).toBe('test@example.com');
      expect(DB.ses()).toBeDefined();
    });

    it('should fail with incorrect password', () => {
      expect(() => {
        Auth.login('test@example.com', 'wrongpassword');
      }).toThrow('Password salah');
    });
  });

  describe('Session Check', () => {
    it('should restore session if valid', () => {
      Auth.reg('Test', 'test@example.com', 'pass123');
      Auth.login('test@example.com', 'pass123');
      
      // Simulate reload
      Auth.cu = null;
      
      expect(Auth.check()).toBe(true);
      expect(Auth.cu.email).toBe('test@example.com');
    });
  });
});
