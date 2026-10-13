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

    it('should reject a cached user when the persisted session is missing', () => {
      Auth.reg('Test', 'test@example.com', 'pass123');
      Auth.login('test@example.com', 'pass123');
      DB.clrSes();

      expect(Auth.check()).toBe(false);
      expect(Auth.cu).toBeNull();
    });
  });

  describe('Logout', () => {
    it('should clear the persisted session and current user', () => {
      Auth.reg('Test', 'test@example.com', 'pass123');
      Auth.login('test@example.com', 'pass123');

      Auth.logout();

      expect(DB.ses()).toBeNull();
      expect(Auth.cu).toBeNull();
      expect(Auth.check()).toBe(false);
    });
  });

  describe('Predefined Admin & User Accounts', () => {
    const { sampleUsers } = require('../js/sample-data.js');

    beforeEach(() => {
      sampleUsers().forEach(u => DB.upsertU(u));
    });

    it('should seed admin and 5 user accounts properly', () => {
      const users = sampleUsers();
      expect(users.length).toBe(6);
      
      const admin = users.find(u => u.role === 'admin');
      expect(admin).toBeDefined();
      expect(admin.email).toBe('adminseloss@jimail.com');

      for (let i = 1; i <= 5; i++) {
        const u = users.find(item => item.email === `user${i}seloss@jimail.com`);
        expect(u).toBeDefined();
        expect(u.role).toBe('user');
      }
    });

    it('should login admin with adminseloss@jimail.com and Hanyaadmin123', () => {
      const admin = Auth.login('adminselosS@jimail.com', 'Hanyaadmin123');
      expect(admin.role).toBe('admin');
      expect(Auth.cu.email).toBe('adminseloss@jimail.com');
    });

    it('should login all 5 user accounts with Masuk123', () => {
      for (let i = 1; i <= 5; i++) {
        const email = `user${i}seloss@jimail.com`;
        const user = Auth.login(email, 'Masuk123');
        expect(user.role).toBe('user');
        expect(Auth.cu.email).toBe(email);
      }
    });
  });
});

