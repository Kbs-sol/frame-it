// Admin JWT verification
export async function verifyAdmin(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return false;
  }
  const token = auth.replace('Bearer ', '');
  return token === env.ADMIN_JWT_SECRET;
}
