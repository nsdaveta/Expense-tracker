import { ObjectId } from 'mongodb'
import { connectToDatabase } from './_lib/db.js'
import { getUserFromRequest } from './_lib/auth.js'

const EXPENSE_CATEGORIES = ['Groceries', 'Housing', 'Utilities', 'Food & Dining', 'Entertainment', 'Transport', 'Other']
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Bonus', 'Investments', 'Rental Income', 'Interest', 'Refund', 'Other']

function sanitizeCategory(type, category) {
  const validList = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  return validList.includes(category) ? category : 'Other'
}

function toClientShape(doc) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    amount: doc.amount,
    type: doc.type,
    category: doc.category,
    date: doc.date,
    paymentMethod: doc.paymentMethod,
    bankName: doc.bankName,
    accountNumber: doc.accountNumber,
    ifscCode: doc.ifscCode,
  }
}

export default async function handler(req, res) {
  const authUser = getUserFromRequest(req)
  if (!authUser) {
    return res.status(401).json({ error: 'Not authenticated. Please log in again.' })
  }

  try {
    const db = await connectToDatabase()
    const transactions = db.collection('transactions')

    if (req.method === 'GET') {
      const items = await transactions
        .find({ userEmail: authUser.email })
        .sort({ createdAt: 1 })
        .toArray()

      return res.status(200).json({ transactions: items.map(toClientShape) })
    }

    if (req.method === 'POST') {
      const { title, amount, category, type, date, paymentMethod, bankName, accountNumber, ifscCode } = req.body || {}

      const numericAmount = Number(amount)
      if (!title || !numericAmount || numericAmount <= 0) {
        return res.status(400).json({ error: 'A title and a valid amount are required.' })
      }

      const txType = type === 'income' ? 'income' : 'expense'

      const doc = {
        userEmail: authUser.email,
        title: String(title).trim(),
        amount: numericAmount,
        type: txType,
        category: sanitizeCategory(txType, category),
        date: date || new Date().toISOString().split('T')[0],
        paymentMethod: paymentMethod === 'bank' ? 'bank' : 'cash',
        bankName: bankName || '',
        accountNumber: accountNumber || '',
        ifscCode: ifscCode || '',
        createdAt: new Date(),
      }

      const result = await transactions.insertOne(doc)
      return res.status(201).json({ transaction: toClientShape({ ...doc, _id: result.insertedId }) })
    }

    if (req.method === 'DELETE') {
      const { id } = req.query
      if (!id || !ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'A valid transaction id is required.' })
      }

      const result = await transactions.deleteOne({
        _id: new ObjectId(id),
        userEmail: authUser.email, // scoped so users can only delete their own data
      })

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Transaction not found.' })
      }
      return res.status(200).json({ deleted: true })
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Transactions error:', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
