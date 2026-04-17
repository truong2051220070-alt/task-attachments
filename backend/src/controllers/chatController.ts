import express from 'express';
import { getSupabaseAdmin } from '../lib/supabase.js';

export const listMessages = async (req: express.Request, res: express.Response) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json(data ? data.reverse() : []);
  } catch (error: any) {
    console.error('List messages error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const sendMessage = async (req: express.Request, res: express.Response) => {
  try {
    const { user_name, content } = req.body;
    if (!user_name || !content) {
      return res.status(400).json({ error: 'User name and content are required' });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert([{ user_name, content }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({ error: error.message });
  }
};
