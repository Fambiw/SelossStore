import { Auth } from '../js/auth.js';
import { DB } from '../js/db.js';
import { SupabaseAuth } from '../js/supabase.js';

describe('Auth Module', () => {
  beforeEach(() => {
    localStorage.clear();
    DB.resetTxCache();
    Auth.cu = null; // Reset current user
  });

  describe('Registration', () => {
    it('should register a new user successfully', () => {
      // Arrange & Act
      const user = Auth.reg('John Doe', 'john@example.com', '081234567890', 'password123');
      
      // Assert
      expect(user).toBeDefined();
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
      expect(user.phone).toBe('6281234567890');
      
      const savedUser = DB.findU('john@example.com');
      expect(savedUser).toBeDefined();
    });

    it('should fail with invalid email', () => {
      expect(() => {
        Auth.reg('John', 'invalid-email', '081234567890', '123456');
      }).toThrow('Format email tidak valid');
    });

    it('should require a valid phone number', () => {
      expect(() => Auth.reg('John', 'john@example.com', '', 'password123'))
        .toThrow('Nomor telepon atau WhatsApp wajib diisi');
      expect(() => Auth.reg('John', 'john@example.com', '12345', 'password123'))
        .toThrow('Format nomor telepon tidak valid');
    });

    it('should fail if email is already registered', () => {
      Auth.reg('John', 'test@example.com', '081234567890', '123456');
      
      expect(() => {
        Auth.reg('Jane', 'test@example.com', '081234567891', '654321');
      }).toThrow('Email sudah terdaftar');
    });

    it('should trim and normalize email input before validation and storage', () => {
      const user = Auth.reg('  John Doe  ', '  JOHN@EXAMPLE.COM  ', '081234567890', 'password123');

      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
      expect(user.phone).toBe('6281234567890');
      expect(DB.findU('john@example.com')).toEqual(user);
      expect(() => Auth.login('  JOHN@EXAMPLE.COM  ', 'password123')).not.toThrow();
    });

    it('should identify profiles that need phone or name completion', () => {
      expect(Auth.hasCompleteProfile({ name: 'Jane', phone: '081234567890' })).toBe(true);
      expect(Auth.hasCompleteProfile({ name: 'Jane', phone: '' })).toBe(false);
      expect(Auth.hasCompleteProfile({ name: '', phone: '081234567890' })).toBe(false);
    });
  });

  describe('Login', () => {
    beforeEach(() => {
      Auth.reg('Test User', 'test@example.com', '081234567890', 'password123');
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
      Auth.reg('Test', 'test@example.com', '081234567890', 'pass123');
      Auth.login('test@example.com', 'pass123');
      
      // Simulate reload
      Auth.cu = null;
      
      expect(Auth.check()).toBe(true);
      expect(Auth.cu.email).toBe('test@example.com');
    });

    describe('Supabase session restoration', () => {
      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('uses the authenticated account profile and clears the previous account cache', async () => {
        const previousUser = { id: 'account-a', email: 'a@example.com', name: 'Account A' };
        DB.upsertU(previousUser);
        DB.setSes({ userId: previousUser.id, expiresAt: new Date(Date.now() + 864e5).toISOString() });
        DB.setTxs([{ id: 'account-a-order', userId: previousUser.id }]);
        Auth.cu = previousUser;

        jest.spyOn(SupabaseAuth, 'getSession').mockResolvedValue({
          user: {
            id: 'account-b',
            email: 'b@example.com',
            user_metadata: { name: 'Old Google Name', phone: '081111111111' },
          },
        });
        jest.spyOn(SupabaseAuth, 'getProfile').mockResolvedValue({
          id: 'account-b',
          name: 'Saved B Name',
          phone: '628222222222',
          role: 'user',
        });

        const restored = await Auth.restoreSupabaseSession();

        expect(restored).toMatchObject({
          id: 'account-b',
          name: 'Saved B Name',
          phone: '628222222222',
        });
        expect(Auth.cu).toEqual(restored);
        expect(DB.ses().userId).toBe('account-b');
        expect(DB.findById('account-a')).toEqual(previousUser);
        expect(DB.txs()).toEqual([]);
      });

      it('clears only the local session when Supabase has no authenticated user', async () => {
        const existingUser = { id: 'account-a', email: 'a@example.com' };
        DB.upsertU(existingUser);
        DB.setSes({ userId: existingUser.id });
        DB.setTxs([{ id: 'account-a-order', userId: existingUser.id }]);
        Auth.cu = existingUser;
        jest.spyOn(SupabaseAuth, 'getSession').mockResolvedValue(null);

        await expect(Auth.restoreSupabaseSession()).resolves.toBeNull();

        expect(Auth.cu).toBeNull();
        expect(DB.ses()).toBeNull();
        expect(DB.findById('account-a')).toEqual(existingUser);
        expect(DB.txs()).toEqual([]);
      });
    });

    it('should reject a cached user when the persisted session is missing', () => {
      Auth.reg('Test', 'test@example.com', '081234567890', 'pass123');
      Auth.login('test@example.com', 'pass123');
      DB.clrSes();

      expect(Auth.check()).toBe(false);
      expect(Auth.cu).toBeNull();
    });
  });

  describe('Logout', () => {
    it('should clear the persisted session and current user', () => {
      Auth.reg('Test', 'test@example.com', '081234567890', 'pass123');
      Auth.login('test@example.com', 'pass123');

      Auth.logout();

      expect(DB.ses()).toBeNull();
      expect(Auth.cu).toBeNull();
      expect(Auth.check()).toBe(false);
    });
  });

});
