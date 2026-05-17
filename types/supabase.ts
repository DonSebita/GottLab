export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categorias: {
        Row: {
          id_categoria: number
          nombre: string
        }
        Insert: {
          id_categoria?: number
          nombre: string
        }
        Update: {
          id_categoria?: number
          nombre?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          apellido: string | null
          auth_id: string | null
          email: string | null
          id_cliente: number
          id_usuario: number | null
          nombre: string | null
          rut: string | null
          telefono: string | null
        }
        Insert: {
          apellido?: string | null
          auth_id?: string | null
          email?: string | null
          id_cliente?: number
          id_usuario?: number | null
          nombre?: string | null
          rut?: string | null
          telefono?: string | null
        }
        Update: {
          apellido?: string | null
          auth_id?: string | null
          email?: string | null
          id_cliente?: number
          id_usuario?: number | null
          nombre?: string | null
          rut?: string | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_clientes_usuarios"
            columns: ["id_usuario"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      compras: {
        Row: {
          fecha: string | null
          id_compra: number
          id_proveedor: number
          iva: number | null
          subtotal: number | null
          total: number | null
        }
        Insert: {
          fecha?: string | null
          id_compra?: number
          id_proveedor: number
          iva?: number | null
          subtotal?: number | null
          total?: number | null
        }
        Update: {
          fecha?: string | null
          id_compra?: number
          id_proveedor?: number
          iva?: number | null
          subtotal?: number | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_id_proveedor_fkey"
            columns: ["id_proveedor"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id_proveedor"]
          },
        ]
      }
      detallecompra: {
        Row: {
          cantidad: number
          id_compra: number
          id_detalle: number
          id_producto: number
          precio_unitario: number
        }
        Insert: {
          cantidad: number
          id_compra: number
          id_detalle?: number
          id_producto: number
          precio_unitario: number
        }
        Update: {
          cantidad?: number
          id_compra?: number
          id_detalle?: number
          id_producto?: number
          precio_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "detallecompra_id_compra_fkey"
            columns: ["id_compra"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id_compra"]
          },
          {
            foreignKeyName: "detallecompra_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id_producto"]
          },
        ]
      }
      grupos_envio: {
        Row: {
          codigo:            string | null
          costo_total_envio: number | null
          courier:           string | null
          created_at:        string
          estado:            string
          fecha_cierre:      string | null
          fecha_despacho:    string | null
          id_cliente:        number | null
          id_grupo_envio:    number
          tipo_despacho:     string | null
          tracking_general:  string | null
        }
        Insert: {
          codigo?:            string | null
          costo_total_envio?: number | null
          courier?:           string | null
          created_at?:        string
          estado?:            string
          fecha_cierre?:      string | null
          fecha_despacho?:    string | null
          id_cliente?:        number | null
          id_grupo_envio?:    number
          tipo_despacho?:     string | null
          tracking_general?:  string | null
        }
        Update: {
          codigo?:            string | null
          costo_total_envio?: number | null
          courier?:           string | null
          created_at?:        string
          estado?:            string
          fecha_cierre?:      string | null
          fecha_despacho?:    string | null
          id_cliente?:        number | null
          id_grupo_envio?:    number
          tipo_despacho?:     string | null
          tracking_general?:  string | null
        }
        Relationships: [
          {
            foreignKeyName: "grupos_envio_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id_cliente"]
          },
        ]
      }
      detallepedido: {
        Row: {
          cantidad: number
          id_detalle: number
          id_pedido: number
          id_producto: number
          precio_unitario: number
        }
        Insert: {
          cantidad: number
          id_detalle?: number
          id_pedido: number
          id_producto: number
          precio_unitario: number
        }
        Update: {
          cantidad?: number
          id_detalle?: number
          id_pedido?: number
          id_producto?: number
          precio_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "detallepedido_id_pedido_fkey"
            columns: ["id_pedido"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id_pedido"]
          },
          {
            foreignKeyName: "detallepedido_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id_producto"]
          },
        ]
      }
      direcciones: {
        Row: {
          alias:        string | null
          ciudad:       string | null
          codigo_postal:string | null
          comuna:       string | null
          direccion:    string | null
          id_cliente:   number
          id_direccion: number
          pais:         string | null
          referencias:  string | null
          region:       string | null
          sucursal:     string | null
          tipo:         string | null
        }
        Insert: {
          alias?:        string | null
          ciudad?:       string | null
          codigo_postal?:string | null
          comuna?:       string | null
          direccion?:    string | null
          id_cliente:    number
          id_direccion?: number
          pais?:         string | null
          referencias?:  string | null
          region?:       string | null
          sucursal?:     string | null
          tipo?:         string | null
        }
        Update: {
          alias?:        string | null
          ciudad?:       string | null
          codigo_postal?:string | null
          comuna?:       string | null
          direccion?:    string | null
          id_cliente?:   number
          id_direccion?: number
          pais?:         string | null
          referencias?:  string | null
          region?:       string | null
          sucursal?:     string | null
          tipo?:         string | null
        }
        Relationships: [
          {
            foreignKeyName: "direcciones_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "fk_direcciones_cliente"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id_cliente"]
          },
        ]
      }
      empleados: {
        Row: {
          apellido: string | null
          auth_id: string | null
          cargo: string | null
          email: string | null
          estado: string | null
          id_empleado: number
          id_usuario: number | null
          nombre: string | null
          rut: string | null
          telefono: string | null
        }
        Insert: {
          apellido?: string | null
          auth_id?: string | null
          cargo?: string | null
          email?: string | null
          estado?: string | null
          id_empleado?: number
          id_usuario?: number | null
          nombre?: string | null
          rut?: string | null
          telefono?: string | null
        }
        Update: {
          apellido?: string | null
          auth_id?: string | null
          cargo?: string | null
          email?: string | null
          estado?: string | null
          id_empleado?: number
          id_usuario?: number | null
          nombre?: string | null
          rut?: string | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_empleados_usuarios"
            columns: ["id_usuario"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      envios: {
        Row: {
          codigo_seguimiento: string | null
          codigo_servicio:    string | null
          costo:              number | null
          courier:            string | null
          dias_estimados:     number | null
          direccion_snapshot: Json | null
          distancia_km:       number | null
          estado:             string | null
          fecha:              string | null
          fecha_entrega:      string | null
          fecha_envio:        string | null
          id_envio:           number
          id_grupo_envio:     number | null
        }
        Insert: {
          codigo_seguimiento?: string | null
          codigo_servicio?:    string | null
          costo?:              number | null
          courier?:            string | null
          dias_estimados?:     number | null
          direccion_snapshot?: Json | null
          distancia_km?:       number | null
          estado?:             string | null
          fecha?:              string | null
          fecha_entrega?:      string | null
          fecha_envio?:        string | null
          id_envio?:           number
          id_grupo_envio?:     number | null
        }
        Update: {
          codigo_seguimiento?: string | null
          codigo_servicio?:    string | null
          costo?:              number | null
          courier?:            string | null
          dias_estimados?:     number | null
          direccion_snapshot?: Json | null
          distancia_km?:       number | null
          estado?:             string | null
          fecha?:              string | null
          fecha_entrega?:      string | null
          fecha_envio?:        string | null
          id_envio?:           number
          id_grupo_envio?:     number | null
        }
        Relationships: [
          {
            foreignKeyName: "envios_id_grupo_envio_fkey"
            columns: ["id_grupo_envio"]
            isOneToOne: false
            referencedRelation: "grupos_envio"
            referencedColumns: ["id_grupo_envio"]
          },
        ]
      }
      gastos: {
        Row: {
          descripcion: string | null
          fecha: string | null
          id_gasto: number
          id_proveedor: number | null
          monto: number | null
          tipo: string | null
        }
        Insert: {
          descripcion?: string | null
          fecha?: string | null
          id_gasto?: number
          id_proveedor?: number | null
          monto?: number | null
          tipo?: string | null
        }
        Update: {
          descripcion?: string | null
          fecha?: string | null
          id_gasto?: number
          id_proveedor?: number | null
          monto?: number | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gastos_id_proveedor_fkey"
            columns: ["id_proveedor"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id_proveedor"]
          },
        ]
      }
      imagenes_productos: {
        Row: {
          es_principal: boolean | null
          id_imagen: number
          id_producto: number
          orden: number | null
          url: string
        }
        Insert: {
          es_principal?: boolean | null
          id_imagen?: number
          id_producto: number
          orden?: number | null
          url: string
        }
        Update: {
          es_principal?: boolean | null
          id_imagen?: number
          id_producto?: number
          orden?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_imagenes_productos"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id_producto"]
          },
        ]
      }
      pagos: {
        Row: {
          estado: string | null
          fecha: string | null
          id_pago: number
          id_pedido: number
          metodo: string | null
          monto: number | null
          transaction_id: string | null
        }
        Insert: {
          estado?: string | null
          fecha?: string | null
          id_pago?: number
          id_pedido: number
          metodo?: string | null
          monto?: number | null
          transaction_id?: string | null
        }
        Update: {
          estado?: string | null
          fecha?: string | null
          id_pago?: number
          id_pedido?: number
          metodo?: string | null
          monto?: number | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_id_pedido_fkey"
            columns: ["id_pedido"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id_pedido"]
          },
        ]
      }
      pedidos: {
        Row: {
          codigo_pedido:      string | null
          costo_envio:        number | null
          descuentos:         number | null
          direccion_snapshot: Json | null
          estado:             string
          estado_envio:       string | null
          estado_pago:        string | null
          fecha:              string | null
          id_cliente:         number
          id_direccion:       number | null
          id_grupo_envio:     number | null
          id_pedido:          number
          observaciones:      string | null
          subtotal:           number | null
          total:              number
        }
        Insert: {
          codigo_pedido?:      string | null
          costo_envio?:        number | null
          descuentos?:         number | null
          direccion_snapshot?: Json | null
          estado:              string
          estado_envio?:       string | null
          estado_pago?:        string | null
          fecha?:              string | null
          id_cliente:          number
          id_direccion?:       number | null
          id_grupo_envio?:     number | null
          id_pedido?:          number
          observaciones?:      string | null
          subtotal?:           number | null
          total:               number
        }
        Update: {
          codigo_pedido?:      string | null
          costo_envio?:        number | null
          descuentos?:         number | null
          direccion_snapshot?: Json | null
          estado?:             string
          estado_envio?:       string | null
          estado_pago?:        string | null
          fecha?:              string | null
          id_cliente?:         number
          id_direccion?:       number | null
          id_grupo_envio?:     number | null
          id_pedido?:          number
          observaciones?:      string | null
          subtotal?:           number | null
          total?:              number
        }
        Relationships: [
          {
            foreignKeyName: "fk_pedidos_cliente"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "pedidos_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "pedidos_id_direccion_fkey"
            columns: ["id_direccion"]
            isOneToOne: false
            referencedRelation: "direcciones"
            referencedColumns: ["id_direccion"]
          },
          {
            foreignKeyName: "pedidos_id_grupo_envio_fkey"
            columns: ["id_grupo_envio"]
            isOneToOne: false
            referencedRelation: "grupos_envio"
            referencedColumns: ["id_grupo_envio"]
          },
        ]
      }
      productos: {
        Row: {
          alto_cm:          number | null
          ancho_cm:         number | null
          descripcion:      string | null
          destacado:        boolean | null
          estado:           string | null
          id_categoria:     number | null
          id_producto:      number
          largo_cm:         number | null
          nombre:           string
          nombre_cientifico:string | null
          nuevo:            boolean | null
          peso_kg:          number | null
          precio_costo:     number | null
          precio_venta:     number
          prioridad:        number | null
          stock_reservado:  number | null
          stock_total:      number | null
          tipo_venta:       string | null
        }
        Insert: {
          alto_cm?:          number | null
          ancho_cm?:         number | null
          descripcion?:      string | null
          destacado?:        boolean | null
          estado?:           string | null
          id_categoria?:     number | null
          id_producto?:      number
          largo_cm?:         number | null
          nombre:            string
          nombre_cientifico?:string | null
          nuevo?:            boolean | null
          peso_kg?:          number | null
          precio_costo?:     number | null
          precio_venta:      number
          prioridad?:        number | null
          stock_reservado?:  number | null
          stock_total?:      number | null
          tipo_venta?:       string | null
        }
        Update: {
          alto_cm?:          number | null
          ancho_cm?:         number | null
          descripcion?:      string | null
          destacado?:        boolean | null
          estado?:           string | null
          id_categoria?:     number | null
          id_producto?:      number
          largo_cm?:         number | null
          nombre?:           string
          nombre_cientifico?:string | null
          nuevo?:            boolean | null
          peso_kg?:          number | null
          precio_costo?:     number | null
          precio_venta?:     number
          prioridad?:        number | null
          stock_reservado?:  number | null
          stock_total?:      number | null
          tipo_venta?:       string | null
        }
        Relationships: [
          {
            foreignKeyName: "productos_id_categoria_fkey"
            columns: ["id_categoria"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id_categoria"]
          },
        ]
      }
      proveedores: {
        Row: {
          correo: string | null
          id_proveedor: number
          nombre: string | null
          rut: string | null
          telefono: string | null
        }
        Insert: {
          correo?: string | null
          id_proveedor?: number
          nombre?: string | null
          rut?: string | null
          telefono?: string | null
        }
        Update: {
          correo?: string | null
          id_proveedor?: number
          nombre?: string | null
          rut?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      reservas: {
        Row: {
          cantidad: number
          estado: string | null
          fecha_expiracion: string
          id_cliente: number
          id_producto: number
          id_reserva: number
          origen: string | null
          precio_especial: number | null
        }
        Insert: {
          cantidad: number
          estado?: string | null
          fecha_expiracion: string
          id_cliente: number
          id_producto: number
          id_reserva?: number
          origen?: string | null
          precio_especial?: number | null
        }
        Update: {
          cantidad?: number
          estado?: string | null
          fecha_expiracion?: string
          id_cliente?: number
          id_producto?: number
          id_reserva?: number
          origen?: string | null
          precio_especial?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_reservas_cliente"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "fk_reservas_producto"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id_producto"]
          },
          {
            foreignKeyName: "reservas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "reservas_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id_producto"]
          },
        ]
      }
      usuarios: {
        Row: {
          activo: boolean | null
          email: string
          id_usuario: number
          password: string
          rol: string
        }
        Insert: {
          activo?: boolean | null
          email: string
          id_usuario?: number
          password: string
          rol: string
        }
        Update: {
          activo?: boolean | null
          email?: string
          id_usuario?: number
          password?: string
          rol?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
