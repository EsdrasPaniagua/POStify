import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXTAUTH_URL + '/api/auth/callback/google'
);

async function createSpreadsheet(accessToken: string, shopName: string) {
  oauth2Client.setCredentials({ access_token: accessToken });
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: shopName },
      sheets: [
        {
          properties: { title: 'Inventario' },
          data: [{
            startRow: 0, startColumn: 0,
            rowData: [{
              values: [
                { userEnteredValue: { stringValue: 'ID' } },
                { userEnteredValue: { stringValue: 'Nombre' } },
                { userEnteredValue: { stringValue: 'Precio' } },
                { userEnteredValue: { stringValue: 'Stock' } },
                { userEnteredValue: { stringValue: 'Categoría' } },
                { userEnteredValue: { stringValue: 'Código' } },
                { userEnteredValue: { stringValue: 'Costo' } },
              ]
            }]
          }]
        },
        {
          properties: { title: 'Ventas' },
          data: [{
            startRow: 0, startColumn: 0,
            rowData: [{
              values: [
                { userEnteredValue: { stringValue: 'ID' } },
                { userEnteredValue: { stringValue: 'Fecha' } },
                { userEnteredValue: { stringValue: 'Total' } },
                { userEnteredValue: { stringValue: 'Items' } },
                { userEnteredValue: { stringValue: 'Método' } },
                { userEnteredValue: { stringValue: 'Productos' } },
              ]
            }]
          }]
        }
      ],
    },
  });

  return spreadsheet.data.spreadsheetId;
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets',
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) {
        const { data: existingUser } = await supabase
          .from('user_data')
          .select('*')
          .eq('email', user.email)
          .single();

        if (!existingUser && account.access_token) {
          const shopName = `Tienda de ${user.name || 'Usuario'}`;
          const sheetId = await createSpreadsheet(account.access_token, shopName);

          await supabase.from('user_data').insert({
            email: user.email,
            user_id: user.email,
            shop_name: shopName,
            sheet_id: sheetId,
            access_token: account.access_token,
          });

          token.sheetId = sheetId;
          token.accessToken = account.access_token;
        } else if (existingUser) {
          token.sheetId = existingUser.sheet_id;
          token.accessToken = existingUser.access_token;
        }
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).sheetId = token.sheetId;
      (session.user as any).accessToken = token.accessToken;
      return session;
    },
  },
});

export { handler as GET, handler as POST };