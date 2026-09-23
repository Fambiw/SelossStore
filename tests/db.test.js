import { DB } from '../js/db.js';

describe('DB - LocalStorage Wrapper', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('User Operations', () => {
    it('should save and retrieve users', () => {
      // Arrange
      const user = { id: 'u_123', email: 'test@example.com' };
      
      // Act
      DB.upsertU(user);
      const foundUser = DB.findU('test@example.com');
      const foundById = DB.findById('u_123');
      
      // Assert
      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe('u_123');
      expect(foundById).toEqual(user);
    });

    it('should update existing user if id matches', () => {
      const user = { id: 'u_123', email: 'test@example.com', role: 'user' };
      DB.upsertU(user);
      
      const updatedUser = { ...user, role: 'admin' };
      DB.upsertU(updatedUser);
      
      const users = DB.users();
      expect(users.length).toBe(1);
      expect(users[0].role).toBe('admin');
    });
  });

  describe('Session Operations', () => {
    it('should set, get, and clear session', () => {
      const session = { token: 'abc', userId: 'u_123' };
      
      DB.setSes(session);
      expect(DB.ses()).toEqual(session);
      
      DB.clrSes();
      expect(DB.ses()).toBeNull();
    });
  });

  describe('Transaction Operations', () => {
    it('should upsert transaction to the beginning of the list', () => {
      const tx1 = { id: 'tx_1', total: 50000 };
      const tx2 = { id: 'tx_2', total: 20000 };
      
      DB.upsertTx(tx1);
      DB.upsertTx(tx2);
      
      const txs = DB.txs();
      expect(txs.length).toBe(2);
      expect(txs[0].id).toBe('tx_2'); // tx2 should be at index 0
    });
  });
});
