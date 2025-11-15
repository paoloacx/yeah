#!/bin/bash

echo "🔧 Configurando widgets de Android para Yeah¡..."

# Check if android folder exists
if [ ! -d "android" ]; then
    echo "❌ Error: La carpeta android/ no existe. Ejecuta primero: npx cap add android"
    exit 1
fi

# Create widgets directory
echo "📁 Creando directorios..."
mkdir -p android/app/src/main/java/com/yeah/app/widgets
mkdir -p android/app/src/main/res/layout
mkdir -p android/app/src/main/res/xml
mkdir -p android/app/src/main/res/drawable

# Create widget layouts
echo "📱 Creando layouts de widgets..."

# Widget Quick Checkin Layout
cat > android/app/src/main/res/layout/widget_quick_checkin.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_quick_checkin"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:gravity="center"
    android:background="@drawable/widget_background"
    android:padding="12dp">

    <ImageView
        android:layout_width="48dp"
        android:layout_height="48dp"
        android:src="@drawable/ic_add"
        android:contentDescription="@string/new_checkin"
        android:background="@drawable/green_circle"
        android:tint="#FFFFFF"
        android:padding="12dp"/>

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Yeah¡"
        android:textColor="#FFFFFF"
        android:textSize="12sp"
        android:textStyle="bold"
        android:gravity="center"
        android:layout_marginTop="4dp"/>

</LinearLayout>
EOF

# Widget Mini Map Layout
cat > android/app/src/main/res/layout/widget_mini_map.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_background"
    android:padding="8dp">

    <TextView
        android:id="@+id/widget_map_title"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Mis lugares"
        android:textColor="#FFFFFF"
        android:textSize="14sp"
        android:textStyle="bold"
        android:layout_alignParentTop="true"/>

    <ImageView
        android:id="@+id/widget_map_image"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:layout_below="@id/widget_map_title"
        android:layout_marginTop="4dp"
        android:scaleType="centerCrop"
        android:contentDescription="@string/map_preview"
        android:background="#2C2C2C"/>

    <TextView
        android:id="@+id/widget_map_count"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_alignParentBottom="true"
        android:layout_alignParentEnd="true"
        android:background="#4CAF50"
        android:padding="6dp"
        android:text="0"
        android:textColor="#FFFFFF"
        android:textSize="14sp"
        android:textStyle="bold"
        android:layout_margin="4dp"/>

</RelativeLayout>
EOF

# Widget Top Places Layout
cat > android/app/src/main/res/layout/widget_top_places.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_background"
    android:padding="16dp">

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Top 3 lugares"
        android:textColor="#FFFFFF"
        android:textSize="14sp"
        android:textStyle="bold"
        android:layout_marginBottom="8dp"/>

    <LinearLayout
        android:id="@+id/widget_place_1"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:layout_marginBottom="4dp"
        android:gravity="center_vertical">

        <TextView
            android:id="@+id/widget_place_1_name"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="📍 Lugar 1"
            android:textColor="#E0E0E0"
            android:textSize="12sp"
            android:singleLine="true"
            android:ellipsize="end"/>

        <TextView
            android:id="@+id/widget_place_1_count"
            android:layout_width="28dp"
            android:layout_height="28dp"
            android:background="@drawable/count_badge"
            android:text="0"
            android:textColor="#FFFFFF"
            android:textSize="12sp"
            android:textStyle="bold"
            android:gravity="center"/>
    </LinearLayout>

    <LinearLayout
        android:id="@+id/widget_place_2"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:layout_marginBottom="4dp"
        android:gravity="center_vertical">

        <TextView
            android:id="@+id/widget_place_2_name"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="📍 Lugar 2"
            android:textColor="#E0E0E0"
            android:textSize="12sp"
            android:singleLine="true"
            android:ellipsize="end"/>

        <TextView
            android:id="@+id/widget_place_2_count"
            android:layout_width="28dp"
            android:layout_height="28dp"
            android:background="@drawable/count_badge"
            android:text="0"
            android:textColor="#FFFFFF"
            android:textSize="12sp"
            android:textStyle="bold"
            android:gravity="center"/>
    </LinearLayout>

    <LinearLayout
        android:id="@+id/widget_place_3"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical">

        <TextView
            android:id="@+id/widget_place_3_name"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="📍 Lugar 3"
            android:textColor="#E0E0E0"
            android:textSize="12sp"
            android:singleLine="true"
            android:ellipsize="end"/>

        <TextView
            android:id="@+id/widget_place_3_count"
            android:layout_width="28dp"
            android:layout_height="28dp"
            android:background="@drawable/count_badge"
            android:text="0"
            android:textColor="#FFFFFF"
            android:textSize="12sp"
            android:textStyle="bold"
            android:gravity="center"/>
    </LinearLayout>

</LinearLayout>
EOF

echo "🎨 Creando drawables..."

# Widget Background
cat > android/app/src/main/res/drawable/widget_background.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#1E1E1E"/>
    <corners android:radius="28dp"/>
    <stroke android:width="2dp" android:color="#4CAF50"/>
</shape>
EOF

# Green Circle for + button
cat > android/app/src/main/res/drawable/green_circle.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="oval">
    <solid android:color="#4CAF50"/>
</shape>
EOF

# Count Badge
cat > android/app/src/main/res/drawable/count_badge.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="oval">
    <solid android:color="#4CAF50"/>
</shape>
EOF

# Add Icon
cat > android/app/src/main/res/drawable/ic_add.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#4CAF50"
        android:pathData="M19,13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
</vector>
EOF

echo "⚙️ Creando configuraciones de widgets..."

# Widget Info XMLs
cat > android/app/src/main/res/xml/widget_quick_checkin_info.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="80dp"
    android:minHeight="80dp"
    android:targetCellWidth="1"
    android:targetCellHeight="1"
    android:updatePeriodMillis="0"
    android:initialLayout="@layout/widget_quick_checkin"
    android:description="@string/widget_quick_checkin_name"
    android:previewImage="@drawable/ic_add"
    android:resizeMode="none"
    android:widgetCategory="home_screen"/>
EOF

cat > android/app/src/main/res/xml/widget_mini_map_info.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="180dp"
    android:targetCellWidth="2"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_mini_map"
    android:description="@string/widget_mini_map_name"
    android:previewImage="@drawable/ic_add"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"/>
EOF

cat > android/app/src/main/res/xml/widget_top_places_info.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="110dp"
    android:targetCellWidth="2"
    android:targetCellHeight="1"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_top_places"
    android:description="@string/widget_top_places_name"
    android:previewImage="@drawable/ic_add"
    android:resizeMode="horizontal"
    android:widgetCategory="home_screen"/>
EOF

echo "📝 Actualizando strings.xml..."

# Add widget strings to strings.xml if not already present
if ! grep -q "widget_quick_checkin_name" android/app/src/main/res/values/strings.xml; then
    # Remove closing </resources> tag
    sed -i '/<\/resources>/d' android/app/src/main/res/values/strings.xml

    # Add widget strings
    cat >> android/app/src/main/res/values/strings.xml << 'EOF'

    <!-- Widget strings -->
    <string name="new_checkin">Nuevo check-in</string>
    <string name="map_preview">Vista previa del mapa</string>
    <string name="widget_quick_checkin_name">Check-in rápido</string>
    <string name="widget_mini_map_name">Mapa miniatura</string>
    <string name="widget_top_places_name">Top 3 lugares</string>
</resources>
EOF
fi

echo "☕ Creando clases Java de widgets..."

# QuickCheckinWidget.java
cat > android/app/src/main/java/com/yeah/app/widgets/QuickCheckinWidget.java << 'EOF'
package com.yeah.app.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import com.yeah.app.R;
import com.yeah.app.MainActivity;

public class QuickCheckinWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quick_checkin);

        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction("OPEN_CHECKIN");
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        views.setOnClickPendingIntent(R.id.widget_quick_checkin, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onEnabled(Context context) {
    }

    @Override
    public void onDisabled(Context context) {
    }
}
EOF

# MiniMapWidget.java
cat > android/app/src/main/java/com/yeah/app/widgets/MiniMapWidget.java << 'EOF'
package com.yeah.app.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import com.yeah.app.R;
import com.yeah.app.MainActivity;

public class MiniMapWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_mini_map);

        SharedPreferences prefs = context.getSharedPreferences("YeahPrefs", Context.MODE_PRIVATE);
        int checkinsCount = prefs.getInt("checkins_count", 0);

        views.setTextViewText(R.id.widget_map_count, String.valueOf(checkinsCount));

        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        views.setOnClickPendingIntent(R.id.widget_map_image, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onEnabled(Context context) {
    }

    @Override
    public void onDisabled(Context context) {
    }

    public static void updateAllWidgets(Context context) {
        Intent intent = new Intent(context, MiniMapWidget.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        context.sendBroadcast(intent);
    }
}
EOF

# TopPlacesWidget.java
cat > android/app/src/main/java/com/yeah/app/widgets/TopPlacesWidget.java << 'EOF'
package com.yeah.app.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;

import com.yeah.app.R;
import com.yeah.app.MainActivity;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class TopPlacesWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_top_places);

        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String topPlacesJson = prefs.getString("top_places", "[]");

        try {
            JSONArray topPlaces = new JSONArray(topPlacesJson);

            if (topPlaces.length() > 0) {
                JSONObject place1 = topPlaces.getJSONObject(0);
                views.setTextViewText(R.id.widget_place_1_name, "📍 " + place1.getString("name"));
                views.setTextViewText(R.id.widget_place_1_count, String.valueOf(place1.getInt("count")));
                views.setViewVisibility(R.id.widget_place_1, View.VISIBLE);
            } else {
                views.setViewVisibility(R.id.widget_place_1, View.GONE);
            }

            if (topPlaces.length() > 1) {
                JSONObject place2 = topPlaces.getJSONObject(1);
                views.setTextViewText(R.id.widget_place_2_name, "📍 " + place2.getString("name"));
                views.setTextViewText(R.id.widget_place_2_count, String.valueOf(place2.getInt("count")));
                views.setViewVisibility(R.id.widget_place_2, View.VISIBLE);
            } else {
                views.setViewVisibility(R.id.widget_place_2, View.GONE);
            }

            if (topPlaces.length() > 2) {
                JSONObject place3 = topPlaces.getJSONObject(2);
                views.setTextViewText(R.id.widget_place_3_name, "📍 " + place3.getString("name"));
                views.setTextViewText(R.id.widget_place_3_count, String.valueOf(place3.getInt("count")));
                views.setViewVisibility(R.id.widget_place_3, View.VISIBLE);
            } else {
                views.setViewVisibility(R.id.widget_place_3, View.GONE);
            }

        } catch (JSONException e) {
            e.printStackTrace();
        }

        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction("OPEN_TOP_YEAH");
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        views.setOnClickPendingIntent(R.id.widget_place_1, pendingIntent);
        views.setOnClickPendingIntent(R.id.widget_place_2, pendingIntent);
        views.setOnClickPendingIntent(R.id.widget_place_3, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onEnabled(Context context) {
    }

    @Override
    public void onDisabled(Context context) {
    }

    public static void updateAllWidgets(Context context) {
        Intent intent = new Intent(context, TopPlacesWidget.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        context.sendBroadcast(intent);
    }
}
EOF

# WidgetPlugin.java
cat > android/app/src/main/java/com/yeah/app/WidgetPlugin.java << 'EOF'
package com.yeah.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.yeah.app.widgets.MiniMapWidget;
import com.yeah.app.widgets.QuickCheckinWidget;
import com.yeah.app.widgets.TopPlacesWidget;

@CapacitorPlugin(name = "WidgetPlugin")
public class WidgetPlugin extends Plugin {

    @PluginMethod
    public void updateWidgets(PluginCall call) {
        Context context = getContext();

        updateWidget(context, MiniMapWidget.class);
        updateWidget(context, TopPlacesWidget.class);
        updateWidget(context, QuickCheckinWidget.class);

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    private void updateWidget(Context context, Class<?> widgetClass) {
        try {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName componentName = new ComponentName(context, widgetClass);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(componentName);

            if (appWidgetIds.length > 0) {
                Intent intent = new Intent(context, widgetClass);
                intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
                intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds);
                context.sendBroadcast(intent);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
EOF

# MainActivity.java
cat > android/app/src/main/java/com/yeah/app/MainActivity.java << 'EOF'
package com.yeah.app;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        handleWidgetIntent(getIntent());
        registerPlugin(com.yeah.app.WidgetPlugin.class);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleWidgetIntent(intent);
    }

    private void handleWidgetIntent(Intent intent) {
        if (intent != null) {
            if ("OPEN_CHECKIN".equals(intent.getAction())) {
                runOnUiThread(() -> {
                    try {
                        Thread.sleep(500);
                        getBridge().getWebView().evaluateJavascript(
                            "if (typeof CardStack !== 'undefined') { CardStack.currentIndex = 1; CardStack.updatePositions(); CardStack.loadCardContent(1); }",
                            null
                        );
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                });
            } else if ("OPEN_TOP_YEAH".equals(intent.getAction())) {
                runOnUiThread(() -> {
                    try {
                        Thread.sleep(500);
                        getBridge().getWebView().evaluateJavascript(
                            "if (typeof showTopPlacesModal !== 'undefined') { showTopPlacesModal(); }",
                            null
                        );
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                });
            }
        }
    }
}
EOF

echo "📄 Actualizando AndroidManifest.xml..."

# Check if widgets are already in manifest
if ! grep -q "QuickCheckinWidget" android/app/src/main/AndroidManifest.xml; then
    # Add widget receivers before closing </application> tag
    sed -i 's|</application>|        <!-- Widgets -->\
        <receiver\
            android:name=".widgets.QuickCheckinWidget"\
            android:exported="true">\
            <intent-filter>\
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />\
            </intent-filter>\
            <meta-data\
                android:name="android.appwidget.provider"\
                android:resource="@xml/widget_quick_checkin_info" />\
        </receiver>\
\
        <receiver\
            android:name=".widgets.MiniMapWidget"\
            android:exported="true">\
            <intent-filter>\
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />\
            </intent-filter>\
            <meta-data\
                android:name="android.appwidget.provider"\
                android:resource="@xml/widget_mini_map_info" />\
        </receiver>\
\
        <receiver\
            android:name=".widgets.TopPlacesWidget"\
            android:exported="true">\
            <intent-filter>\
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />\
            </intent-filter>\
            <meta-data\
                android:name="android.appwidget.provider"\
                android:resource="@xml/widget_top_places_info" />\
        </receiver>\
\
    </application>|' android/app/src/main/AndroidManifest.xml
fi

echo ""
echo "✅ ¡Widgets configurados correctamente!"
echo ""
echo "Próximos pasos:"
echo "  1. Sincroniza los cambios: npx cap sync android"
echo "  2. Abre Android Studio: npx cap open android"
echo "  3. Instala la app en tu dispositivo"
echo "  4. Añade los widgets desde la pantalla de inicio"
echo ""
