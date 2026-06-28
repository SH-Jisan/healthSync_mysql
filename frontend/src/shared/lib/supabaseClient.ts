// src/shared/lib/supabaseClient.ts
import type { 
  User, 
  Session, 
  AuthChangeEvent, 
  AuthResponse, 
  UserResponse
} from '@supabase/supabase-js';

const BACKEND_URL = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:5000';

class QueryBuilder {
  private table: string;
  private action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private selectFields: string = '*';
  private filters: Array<{ type: string; field: string; value: any }> = [];
  private orderFields: Array<{ field: string; ascending: boolean }> = [];
  private limitCount?: number;
  private isSingle: boolean = false;
  private data: any = null;

  constructor(table: string) {
    this.table = table;
  }

  select(fields: string = '*') {
    this.selectFields = fields;
    return this;
  }

  insert(data: any) {
    this.action = 'insert';
    this.data = data;
    return this;
  }

  update(data: any) {
    this.action = 'update';
    this.data = data;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  upsert(data: any, _options?: { onConflict?: string }) {
    this.action = 'upsert';
    this.data = data;
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ type: 'eq', field, value });
    return this;
  }

  neq(field: string, value: any) {
    this.filters.push({ type: 'neq', field, value });
    return this;
  }

  ilike(field: string, value: any) {
    this.filters.push({ type: 'ilike', field, value });
    return this;
  }

  in(field: string, value: any[]) {
    this.filters.push({ type: 'in', field, value });
    return this;
  }

  or(_filterStr: string) {
    return this;
  }

  order(field: string, { ascending = true } = {}) {
    this.orderFields.push({ field, ascending });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isSingle = true;
    return this;
  }

  async execute(): Promise<{ data: any[] | any; error: any }> {
    try {
      const token = localStorage.getItem('healthsync_auth_token');
      const response = await fetch(`${BACKEND_URL}/api/db/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          table: this.table,
          action: this.action,
          selectFields: this.selectFields,
          filters: this.filters,
          orderFields: this.orderFields,
          limitCount: this.limitCount,
          isSingle: this.isSingle,
          data: this.data
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        return { data: null, error: { message: resData.error || 'Database error' } };
      }
      return { data: resData.data, error: null };
    } catch (err: any) {
      console.error('Query error:', err);
      return { data: null, error: { message: err.message || 'Network error' } };
    }
  }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

const authListeners: Array<(event: AuthChangeEvent, session: Session | null) => void> = [];

const notifyAuthListeners = (event: AuthChangeEvent, session: Session | null) => {
  authListeners.forEach(listener => {
    try {
      listener(event, session);
    } catch (err) {
      console.error('Auth listener error:', err);
    }
  });
};

export const supabase = {
  auth: {
    signUp: async ({ email, password, options }: any): Promise<AuthResponse> => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, options })
        });
        const resData = await response.json();
        if (!response.ok) {
          return { data: { user: null, session: null }, error: { message: resData.error || 'Signup failed', status: response.status } as any };
        }
        
        const { user, session } = resData.data;
        localStorage.setItem('healthsync_auth_token', session.access_token);
        localStorage.setItem('healthsync_auth_user', JSON.stringify(user));
        
        notifyAuthListeners('SIGNED_IN', session);
        return { data: { user, session }, error: null };
      } catch (err: any) {
        return { data: { user: null, session: null }, error: { message: err.message || 'Network error' } as any };
      }
    },

    signInWithPassword: async ({ email, password }: any): Promise<AuthResponse> => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/auth/signin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const resData = await response.json();
        if (!response.ok) {
          return { data: { user: null, session: null }, error: { message: resData.error || 'Login failed', status: response.status } as any };
        }

        const { user, session } = resData.data;
        localStorage.setItem('healthsync_auth_token', session.access_token);
        localStorage.setItem('healthsync_auth_user', JSON.stringify(user));

        notifyAuthListeners('SIGNED_IN', session);
        return { data: { user, session }, error: null };
      } catch (err: any) {
        return { data: { user: null, session: null }, error: { message: err.message || 'Network error' } as any };
      }
    },

    signOut: async (): Promise<{ error: any }> => {
      localStorage.removeItem('healthsync_auth_token');
      localStorage.removeItem('healthsync_auth_user');
      notifyAuthListeners('SIGNED_OUT', null);
      return { error: null };
    },

    getUser: async (): Promise<UserResponse> => {
      const userStr = localStorage.getItem('healthsync_auth_user');
      if (userStr) {
        try {
          return { data: { user: JSON.parse(userStr) as User }, error: null };
        } catch (e) {
          return { data: { user: null }, error: null } as any;
        }
      }
      return { data: { user: null }, error: null } as any;
    },

    getSession: async (): Promise<{ data: { session: Session | null }; error: any }> => {
      const token = localStorage.getItem('healthsync_auth_token');
      const userStr = localStorage.getItem('healthsync_auth_user');
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr) as User;
          return {
            data: {
              session: {
                access_token: token,
                token_type: 'bearer',
                user,
                expires_in: 3600 * 24 * 7,
                expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
                refresh_token: 'mock-refresh-token'
              } as Session
            },
            error: null
          };
        } catch (e) {
          return { data: { session: null }, error: null };
        }
      }
      return { data: { session: null }, error: null };
    },

    onAuthStateChange: (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
      authListeners.push(callback);
      // Trigger initial callback if session exists
      const token = localStorage.getItem('healthsync_auth_token');
      const userStr = localStorage.getItem('healthsync_auth_user');
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr) as User;
          callback('SIGNED_IN', {
            access_token: token,
            token_type: 'bearer',
            user,
            expires_in: 3600 * 24 * 7,
            expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
            refresh_token: 'mock-refresh-token'
          } as Session);
        } catch (e) {}
      } else {
        callback('SIGNED_OUT', null);
      }

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const idx = authListeners.indexOf(callback);
              if (idx !== -1) authListeners.splice(idx, 1);
            }
          }
        }
      };
    }
  },

  from: (table: string) => {
    return new QueryBuilder(table);
  },

  storage: {
    from: (_bucket: string) => ({
      upload: async (fileName: string, file: File) => {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('filePath', fileName);

          const token = localStorage.getItem('healthsync_auth_token');
          const response = await fetch(`${BACKEND_URL}/api/storage/upload`, {
            method: 'POST',
            headers: {
              'Authorization': token ? `Bearer ${token}` : ''
            },
            body: formData
          });

          const resData = await response.json();
          if (!response.ok) {
            return { data: null, error: { message: resData.error || 'Upload failed' } };
          }
          return { data: { path: fileName }, error: null };
        } catch (err: any) {
          return { data: null, error: { message: err.message || 'Network error' } };
        }
      },

      getPublicUrl: (fileName: string) => {
        return {
          data: {
            publicUrl: `${BACKEND_URL}/uploads/${fileName}`
          }
        };
      },

      download: async (fileName: string) => {
        try {
          const token = localStorage.getItem('healthsync_auth_token');
          const response = await fetch(`${BACKEND_URL}/api/storage/download?path=${encodeURIComponent(fileName)}`, {
            headers: {
              'Authorization': token ? `Bearer ${token}` : ''
            }
          });

          if (!response.ok) {
            const resData = await response.json();
            return { data: null, error: { message: resData.error || 'Download failed' } };
          }

          const blob = await response.blob();
          return { data: blob, error: null };
        } catch (err: any) {
          return { data: null, error: { message: err.message || 'Network error' } };
        }
      },

      remove: async (paths: string[]) => {
        try {
          const token = localStorage.getItem('healthsync_auth_token');
          const response = await fetch(`${BACKEND_URL}/api/storage/remove`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({ paths })
          });

          const resData = await response.json();
          if (!response.ok) {
            return { data: null, error: { message: resData.error || 'Remove failed' } };
          }
          return { data: { success: true }, error: null };
        } catch (err: any) {
          return { data: null, error: { message: err.message || 'Network error' } };
        }
      }
    })
  },

  functions: {
    invoke: async (functionName: string, options?: any) => {
      try {
        const token = localStorage.getItem('healthsync_auth_token');
        const method = options?.method || 'POST';
        const headers: Record<string, string> = {
          'Authorization': token ? `Bearer ${token}` : ''
        };
        if (method !== 'GET') {
          headers['Content-Type'] = 'application/json';
        }
        const fetchOptions: RequestInit = {
          method,
          headers
        };
        if (method !== 'GET' && options?.body) {
          fetchOptions.body = JSON.stringify(options.body);
        }
        const response = await fetch(`${BACKEND_URL}/api/functions/${functionName}`, fetchOptions);

        const resData = await response.json();
        if (!response.ok) {
          return {
            data: null,
            error: {
              message: resData.error || 'Function execution failed',
              context: {
                response: {
                  status: response.status
                }
              }
            }
          };
        }
        return { data: resData, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err.message || 'Network error' } };
      }
    }
  },

  rpc: async (functionName: string, args?: any) => {
    try {
      const token = localStorage.getItem('healthsync_auth_token');
      const response = await fetch(`${BACKEND_URL}/api/rpc/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(args || {})
      });

      const resData = await response.json();
      if (!response.ok) {
        return { data: null, error: { message: resData.error || 'RPC failed' } };
      }
      return { data: resData.data, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Network error' } };
    }
  },

  globalSearch: async (query: string, filters?: any): Promise<{ data: any; stats?: any; error: any }> => {
    try {
      const token = localStorage.getItem('healthsync_auth_token');
      const response = await fetch(`${BACKEND_URL}/api/db/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ query, filters })
      });

      const resData = await response.json();
      if (!response.ok) {
        return { data: null, stats: null, error: { message: resData.error || 'Search failed' } };
      }
      return { data: resData.data, stats: resData.stats, error: null };
    } catch (err: any) {
      console.error('Global Search API error:', err);
      return { data: null, stats: null, error: { message: err.message || 'Network error' } };
    }
  }
};