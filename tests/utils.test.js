import { fmt, vEmail, vWA, nWA, disc } from '../js/utils.js';

describe('Utility Functions', () => {
  describe('fmt() - Currency Formatter', () => {
    it('should format numbers to Indonesian Rupiah', () => {
      // Arrange
      const amount = 50000;
      
      // Act
      const formatted = fmt(amount);
      
      // Assert
      // toLocaleString varies between node versions, usually it's "50.000"
      expect(formatted.replace(/\s/g, '')).toContain('Rp50.000');
    });
  });

  describe('vEmail() - Email Validator', () => {
    it('should return true for valid emails', () => {
      // Act & Assert
      expect(vEmail('test@example.com')).toBe(true);
      expect(vEmail('user.name@domain.co.id')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      // Act & Assert
      expect(vEmail('invalid-email')).toBe(false);
      expect(vEmail('test@.com')).toBe(false);
      expect(vEmail('@example.com')).toBe(false);
    });
  });

  describe('vWA() - WhatsApp Number Validator', () => {
    it('should validate Indonesian WhatsApp numbers starting with 08 or 628', () => {
      // Act & Assert
      expect(vWA('081234567890')).toBe(true);
      expect(vWA('6281234567890')).toBe(true);
      expect(vWA('+6281234567890')).toBe(true);
      expect(vWA('0812-3456-7890')).toBe(true);
    });

    it('should invalidate incorrect WhatsApp numbers', () => {
      // Act & Assert
      expect(vWA('091234567890')).toBe(false); // Does not start with 08 or 628
      expect(vWA('081234')).toBe(false); // Too short
    });
  });

  describe('nWA() - WhatsApp Number Normalizer', () => {
    it('should convert 08 to 628', () => {
      expect(nWA('081234567890')).toBe('6281234567890');
    });

    it('should remove spaces and dashes', () => {
      expect(nWA('0812-3456-7890')).toBe('6281234567890');
    });

    it('should keep 628 as is', () => {
      expect(nWA('6281234567890')).toBe('6281234567890');
    });

    it('should normalize +62 prefix as well', () => {
      expect(nWA('+6281234567890')).toBe('6281234567890');
    });
  });
  
  describe('disc() - Discount Calculator', () => {
    it('should calculate correct discount percentage', () => {
      expect(disc(100000, 80000)).toBe(20);
      expect(disc(50000, 25000)).toBe(50);
    });
    
    it('should return 0 if original price is less or equal to current price', () => {
      expect(disc(50000, 50000)).toBe(0);
      expect(disc(40000, 50000)).toBe(0);
      expect(disc(0, 50000)).toBe(0);
    });
  });
});
