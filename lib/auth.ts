import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10; // Standard salt rounds for bcrypt

/**
 * Hashes a plain text password using bcrypt.
 * @param password - The plain text password to hash.
 * @returns A promise that resolves with the hashed password.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) {
    throw new Error("Password cannot be empty");
  }
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    console.error("Error hashing password:", error);
    throw new Error("Could not hash password");
  }
}

// Optional: You might also want a function to compare passwords
/**
 * Compares a plain text password with a hash.
 * @param password - The plain text password.
 * @param hash - The hash to compare against.
 * @returns A promise that resolves with true if the password matches the hash, false otherwise.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        console.error("Error comparing password:", error);
        // In case of error, return false for security reasons
        return false;
    }
} 