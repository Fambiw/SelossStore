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

    it('should remove legacy demo accounts and clear their persisted session', () => {
      DB.upsertU({ id: 'admin_001', email: 'old-admin@example.com' });
      DB.upsertU({ id: 'user_001', email: 'sample-member@example.com' });
      DB.upsertU({ id: 'u_real', email: 'real-member@example.com' });
      DB.setSes({ userId: 'admin_001', token: 'legacy-token' });

      expect(DB.removeDemoUsers()).toBe(2);
      expect(DB.users().map(user => user.id)).toEqual(['u_real']);
      expect(DB.ses()).toBeNull();
    });

    it('should preserve a real user session while removing demo accounts', () => {
      DB.upsertU({ id: 'user_002', email: 'sample-member@example.com' });
      DB.upsertU({ id: 'u_real', email: 'real-member@example.com' });
      const session = { userId: 'u_real', token: 'real-token' };
      DB.setSes(session);

      DB.removeDemoUsers();

      expect(DB.users().map(user => user.id)).toEqual(['u_real']);
      expect(DB.ses()).toEqual(session);
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

  describe('Product Operations', () => {
    it('should seed default products if none exist', () => {
      const prods = DB.prods();
      expect(Array.isArray(prods)).toBe(true);
      expect(prods.length).toBeGreaterThan(0);
    });

    it('should update and persist products via setProds', () => {
      const customProds = [{ id: 'p_custom', name: 'Custom Product', vars: [{ id: 'v1', n: '1 Bulan', p: 15000 }] }];
      DB.setProds(customProds);
      expect(DB.prods()).toEqual(customProds);
    });

    it('should delete product by id via delProd', () => {
      const testProds = [
        { id: 'p_1', name: 'Product 1', vars: [] },
        { id: 'p_2', name: 'Product 2', vars: [] }
      ];
      DB.setProds(testProds);
      const remaining = DB.delProd('p_1');
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe('p_2');
      expect(DB.prods().find(p => p.id === 'p_1')).toBeUndefined();
    });
  });

  describe('Banner Operations', () => {
    it('should start with no banners when none have been saved', () => {
      const banners = DB.banners();
      expect(Array.isArray(banners)).toBe(true);
      expect(banners).toEqual([]);
    });

    it('should update and persist banners via setBanners', () => {
      const testBanners = [
        { id: 'b_1', title: 'Banner 1', image: 'test1.png' },
        { id: 'b_2', title: 'Banner 2', image: 'test2.png' }
      ];
      DB.setBanners(testBanners);
      expect(DB.banners()).toEqual(testBanners);
    });

    it('should reject more than five active banners', () => {
      const banners = Array.from({ length: 6 }, (_, i) => ({ id: `b_${i}` }));

      expect(DB.setBanners(banners)).toBe(false);
      expect(DB.banners()).toEqual([]);
    });

    it('should report when banner persistence fails', () => {
      const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage full');
      });

      expect(DB.setBanners([{ id: 'b_1' }])).toBe(false);
      expect(DB.banners()).toEqual([]);
      setItem.mockRestore();
    });

    it('should delete banner by id via delBanner', () => {
      const testBanners = [
        { id: 'b_1', title: 'Banner 1', image: 'test1.png' },
        { id: 'b_2', title: 'Banner 2', image: 'test2.png' }
      ];
      DB.setBanners(testBanners);
      const remaining = DB.delBanner('b_1');
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe('b_2');
      expect(DB.banners().find(b => b.id === 'b_1')).toBeUndefined();
    });
  });
});
