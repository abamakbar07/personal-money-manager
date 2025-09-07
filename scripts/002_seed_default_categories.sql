-- Insert default categories for new users
-- This will be called when a new user is created

INSERT INTO categories (user_id, name, type, color, is_default) VALUES
-- Expense categories
($1, 'Food & Dining', 'expense', 'red', true),
($1, 'Transportation', 'expense', 'blue', true),
($1, 'Shopping', 'expense', 'purple', true),
($1, 'Entertainment', 'expense', 'pink', true),
($1, 'Bills & Utilities', 'expense', 'yellow', true),
($1, 'Healthcare', 'expense', 'green', true),
($1, 'Education', 'expense', 'indigo', true),
($1, 'Travel', 'expense', 'teal', true),
($1, 'Transfer', 'expense', 'gray', true),
($1, 'Other', 'expense', 'gray', true),

-- Income categories
($1, 'Salary', 'income', 'green', true),
($1, 'Freelance', 'income', 'blue', true),
($1, 'Investment', 'income', 'purple', true),
($1, 'Gift', 'income', 'pink', true),
($1, 'Bonus', 'income', 'yellow', true),
($1, 'Transfer', 'income', 'gray', true),
($1, 'Other', 'income', 'gray', true)
ON CONFLICT (user_id, name, type) DO NOTHING;
